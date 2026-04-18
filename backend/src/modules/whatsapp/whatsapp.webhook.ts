import { supabase } from '../../config/supabase.js';
import { hashPhone, encryptPhone } from '../../lib/crypto.js';
import { logger } from '../../lib/logger.js';
import { env } from '../../config/env.js';
import { findBusinessByWaPhoneId, sendMessage } from './whatsapp.service.js';
import { optOutConfirmText, stampIssuedText, rewardEarnedText } from './whatsapp.templates.js';
import type { WebhookPayload, InboundMessage, MessageStatus } from '../../types/whatsapp.js';

const OPT_OUT_KEYWORDS = new Set(['stop', 'abmelden', 'nein', 'stopp']);
const STAMP_KEYWORDS   = new Set(['stempel', 'stamp']);

// Mindestabstand zwischen zwei Keyword-Stempeln pro Kunde (Missbrauchsschutz)
const STAMP_COOLDOWN_HOURS = 8;

export async function handleWebhookPayload(payload: WebhookPayload): Promise<void> {
  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.field !== 'messages') continue;

      const { metadata, messages, statuses } = change.value;

      if (messages) {
        for (const msg of messages) {
          await handleInboundMessage(msg, metadata.phone_number_id).catch((err) => {
            logger.error({ err, msgId: msg.id }, 'Error handling inbound message');
          });
        }
      }

      if (statuses) {
        for (const status of statuses) {
          await handleStatusUpdate(status).catch((err) => {
            logger.error({ err }, 'Error handling status update');
          });
        }
      }
    }
  }
}

async function handleInboundMessage(
  msg: InboundMessage,
  phoneNumberId: string,
): Promise<void> {
  // Dedup: wa_message_id is PRIMARY KEY — duplicate insert returns 23505
  const { error: dedupError } = await supabase
    .from('wa_message_events')
    .insert({ wa_message_id: msg.id, event_type: 'inbound' });

  if (dedupError?.code === '23505') return;
  if (dedupError) logger.warn({ dedupError }, 'Dedup insert failed — processing anyway');

  const business = await findBusinessByWaPhoneId(phoneNumberId);
  if (!business) {
    logger.warn({ phoneNumberId }, 'Webhook received for unknown phone number ID');
    return;
  }

  await supabase
    .from('wa_message_events')
    .update({ business_id: business.id })
    .eq('wa_message_id', msg.id);

  if (msg.type !== 'text' || !msg.text) return;

  const text = msg.text.body.trim().toLowerCase();

  if (OPT_OUT_KEYWORDS.has(text)) {
    await handleOptOut(msg.from, business.id, phoneNumberId);
    return;
  }

  if (STAMP_KEYWORDS.has(text)) {
    await handleKeywordStamp(msg.from, business, phoneNumberId);
    return;
  }

  logger.info({ businessId: business.id }, 'Inbound text received (non-keyword)');
}

// ── Keyword-Stempel ──────────────────────────────────────────────────────────

interface KeywordBusiness {
  id: string;
  slug: string;
  stamp_count: number;
  stamps_per_reward: number;
  reward_stages: Array<{ stamp: number; description: string }> | null;
  reward_description: string;
}

async function handleKeywordStamp(
  fromPhone: string,
  business: KeywordBusiness,
  phoneNumberId: string,
): Promise<void> {
  const e164       = `+${fromPhone}`;
  const phoneHash  = hashPhone(e164);

  // Kunden anhand des Phone-Hash suchen
  const { data: customer } = await supabase
    .from('customers')
    .select('id, phone_enc, total_stamps, lifetime_stamps, wallet_token')
    .eq('business_id', business.id)
    .eq('phone_hash', phoneHash)
    .is('opted_out_at', null)
    .maybeSingle();

  if (!customer) {
    // Unbekannte Nummer — freundlicher Hinweis zum Registrieren
    const tmpEnc = encryptPhone(e164);
    const { data: biz } = await supabase
      .from('businesses')
      .select('wa_access_token_enc, slug')
      .eq('id', business.id)
      .single();

    if (biz?.wa_access_token_enc) {
      const { to: _to, ...body } = {
        messaging_product: 'whatsapp' as const,
        recipient_type: 'individual' as const,
        to: e164,
        type: 'text' as const,
        text: { body: `Du bist noch nicht registriert. Melde dich hier an und sammle Stempel! 👉 ${biz.slug ? `${process.env['CLIENT_URL'] ?? ''}/r/${biz.slug}` : 'Frag das Personal nach dem Link.'}` },
      };
      await sendMessage(phoneNumberId, biz.wa_access_token_enc, tmpEnc, body);
    }
    return;
  }

  // Cooldown prüfen — letzten Keyword-Stempel dieses Kunden holen
  const cooldownSince = new Date(Date.now() - STAMP_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();
  const { data: recentStamp } = await supabase
    .from('stamp_events')
    .select('created_at')
    .eq('customer_id', customer.id)
    .eq('source', 'keyword')
    .gte('created_at', cooldownSince)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: biz } = await supabase
    .from('businesses')
    .select('wa_access_token_enc')
    .eq('id', business.id)
    .single();

  if (!biz?.wa_access_token_enc) return;

  if (recentStamp) {
    // Cooldown aktiv — ablehnen
    const nextAvailable = new Date(new Date(recentStamp.created_at).getTime() + STAMP_COOLDOWN_HOURS * 60 * 60 * 1000);
    const hours = Math.ceil((nextAvailable.getTime() - Date.now()) / (60 * 60 * 1000));
    const { to: _to, ...body } = {
      messaging_product: 'whatsapp' as const,
      recipient_type: 'individual' as const,
      to: e164,
      type: 'text' as const,
      text: { body: `Du hast heute bereits einen Stempel erhalten. ⏳\n\nDer nächste ist in ca. ${hours} Stunde${hours === 1 ? '' : 'n'} verfügbar.` },
    };
    await sendMessage(phoneNumberId, biz.wa_access_token_enc, customer.phone_enc, body);
    return;
  }

  // Stempel ausstellen
  const stampCount = business.stamp_count ?? business.stamps_per_reward;
  const stages = business.reward_stages ?? [{ stamp: stampCount, description: business.reward_description }];

  const prevTotal   = customer.total_stamps;
  const newTotal    = prevTotal + 1;
  const newLifetime = customer.lifetime_stamps + 1;

  // Welche Reward-Stufen wurden überschritten?
  const crossed = stages.filter(
    (s) => s.stamp > prevTotal && s.stamp <= Math.min(newTotal, stampCount),
  );
  const rewardIssued = crossed.length > 0;
  const finalTotal = newTotal >= stampCount ? newTotal % stampCount : newTotal;

  await supabase
    .from('customers')
    .update({ total_stamps: finalTotal, lifetime_stamps: newLifetime, last_interaction_at: new Date().toISOString() })
    .eq('id', customer.id);

  await supabase
    .from('stamp_events')
    .insert({ business_id: business.id, customer_id: customer.id, amount: 1, source: 'keyword' });

  const voucherCodes: string[] = [];

  for (const stage of crossed) {
    const { data: voucher } = await supabase
      .from('vouchers')
      .insert({ business_id: business.id, customer_id: customer.id, type: 'reward', description: stage.description })
      .select('code')
      .single();

    if (voucher?.code) voucherCodes.push(voucher.code);
  }

  // Bestätigung mit CTA-Button zur Wallet senden
  const walletUrl = customer.wallet_token
    ? `${env.CLIENT_URL}/r/${business.slug}/wallet/${customer.wallet_token}?new=1`
    : undefined;

  const firstStage = crossed[0];
  const msgObj = rewardIssued && firstStage
    ? rewardEarnedText(e164, voucherCodes.join(', '), firstStage.description, walletUrl)
    : stampIssuedText(e164, 1, finalTotal, stampCount, walletUrl);

  const { to: _to, ...msgBody } = msgObj;
  await sendMessage(phoneNumberId, biz.wa_access_token_enc, customer.phone_enc, msgBody);

  logger.info({ businessId: business.id, customerId: customer.id, rewardIssued }, 'Keyword stamp issued');
}

// ── Opt-out ──────────────────────────────────────────────────────────────────

async function handleOptOut(
  fromPhone: string,
  businessId: string,
  phoneNumberId: string,
): Promise<void> {
  const e164      = `+${fromPhone}`;
  const phoneHash = hashPhone(e164);

  const { data: customer } = await supabase
    .from('customers')
    .select('id, phone_enc, opted_out_at')
    .eq('business_id', businessId)
    .eq('phone_hash', phoneHash)
    .maybeSingle();

  if (!customer || customer.opted_out_at) return;

  await supabase
    .from('customers')
    .update({ phone_enc: '[REDACTED]', display_name: null, wa_contact_name: null, opt_in_ip: null, opted_out_at: new Date().toISOString() })
    .eq('id', customer.id);

  await supabase
    .from('notification_logs')
    .insert({ business_id: businessId, customer_id: customer.id, event_type: 'opt_out', status: 'sent' });

  const { data: biz } = await supabase
    .from('businesses')
    .select('wa_access_token_enc')
    .eq('id', businessId)
    .single();

  if (biz?.wa_access_token_enc) {
    const tmpEnc = encryptPhone(e164);
    const { to: _to, ...body } = optOutConfirmText(e164);
    await sendMessage(phoneNumberId, biz.wa_access_token_enc, tmpEnc, body);
  }

  logger.info({ businessId, customerId: customer.id }, 'Customer opted out');
}

// ── Status-Updates ───────────────────────────────────────────────────────────

async function handleStatusUpdate(status: MessageStatus): Promise<void> {
  if (!status.id) return;
  await supabase
    .from('notification_logs')
    .update({ status: status.status })
    .eq('wa_message_id', status.id);
}
