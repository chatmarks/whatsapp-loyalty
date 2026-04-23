import { supabase } from '../../config/supabase.js';
import { hashPhone, encryptPhone } from '../../lib/crypto.js';
import { logger } from '../../lib/logger.js';
import { findBusinessByWaPhoneId, sendMessage } from './whatsapp.service.js';
import { optOutConfirmText, optInWelcomeText } from './whatsapp.templates.js';
import { createStampRequest } from '../stamp-requests/stamp-requests.service.js';
import type { WebhookPayload, InboundMessage, MessageStatus } from '../../types/whatsapp.js';
import { env } from '../../config/env.js';

const OPT_OUT_KEYWORDS = new Set(['stop', 'abmelden', 'nein', 'stopp']);
const STAMP_KEYWORDS   = new Set(['stempel', 'stamp']);
// Keyword sent by the QR redirect page for new registrations
const OPT_IN_KEYWORDS  = new Set(['anmelden']);

export async function handleWebhookPayload(payload: WebhookPayload): Promise<void> {
  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.field !== 'messages') continue;

      const { metadata, messages, statuses, contacts } = change.value;

      // Build phone → contact name map from webhook contacts array
      const contactNames = new Map(
        (contacts ?? []).map((c) => [c.wa_id, c.profile.name]),
      );

      if (messages) {
        for (const msg of messages) {
          const contactName = contactNames.get(msg.from) ?? null;
          await handleInboundMessage(msg, metadata.phone_number_id, contactName).catch((err) => {
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
  contactName: string | null,
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

  // Resolve customer by phone hash for message storage
  const phoneHash = hashPhone(`+${msg.from}`);
  const { data: msgCustomer } = await supabase
    .from('customers')
    .select('id')
    .eq('business_id', business.id)
    .eq('phone_hash', phoneHash)
    .maybeSingle();

  if (msg.type === 'text' && msg.text) {
    const { error: insertError } = await supabase.from('wa_messages').insert({
      business_id: business.id,
      customer_id: msgCustomer?.id ?? null,
      phone_hash: phoneHash,
      direction: 'inbound',
      body: msg.text.body,
      wa_message_id: msg.id,
      status: 'delivered',
    });
    if (insertError) {
      logger.error({ insertError, msgId: msg.id }, 'Failed to store inbound message');
    }
  }

  if (msg.type !== 'text' || !msg.text) return;

  const rawText  = msg.text.body.trim();
  const textLow  = rawText.toLowerCase();

  if (OPT_OUT_KEYWORDS.has(textLow)) {
    await handleOptOut(msg.from, business.id, phoneNumberId);
    return;
  }

  // Extract optional referral code embedded in message: "Anmelden REF:1234"
  const refMatch     = rawText.match(/\bREF:(\w+)/i);
  const referralCode = refMatch?.[1] ?? null;
  const baseText     = textLow.replace(/\s+ref:\w+/i, '').trim();

  if (OPT_IN_KEYWORDS.has(baseText)) {
    await handleOptIn(msg.from, business, phoneNumberId, contactName, referralCode);
    return;
  }

  if (STAMP_KEYWORDS.has(textLow)) {
    await handleKeywordStamp(msg.from, business, phoneNumberId);
    return;
  }

  logger.info({ businessId: business.id }, 'Inbound text received (non-keyword)');
}

// ── Registrierung via WhatsApp ────────────────────────────────────────────────
// Triggered by the QR-redirect page pre-filling "Anmelden" in the WA message.
// No web form — name comes from the WhatsApp contact profile.

interface OptInBusiness {
  id: string;
  slug: string;
  stamp_count: number;
  stamps_per_reward: number;
}

async function handleOptIn(
  fromPhone: string,
  business: OptInBusiness,
  phoneNumberId: string,
  contactName: string | null,
  referralCode: string | null,
): Promise<void> {
  const e164      = `+${fromPhone}`;
  const phoneHash = hashPhone(e164);
  const phoneEnc  = encryptPhone(e164);

  const { data: biz } = await supabase
    .from('businesses')
    .select('wa_access_token_enc, business_name, slug, message_templates')
    .eq('id', business.id)
    .single();

  if (!biz?.wa_access_token_enc) return;

  const templates  = (biz.message_templates as Record<string, string> | null) ?? {};
  const sendText   = async (body: string): Promise<void> => {
    const { to: _to, ...msg } = {
      messaging_product: 'whatsapp' as const,
      recipient_type: 'individual' as const,
      to: e164,
      type: 'text' as const,
      text: { body },
    };
    await sendMessage(phoneNumberId, biz.wa_access_token_enc!, encryptPhone(e164), msg);
  };

  // Check for existing customer
  const { data: existing } = await supabase
    .from('customers')
    .select('id, opted_out_at, wallet_token, display_name')
    .eq('business_id', business.id)
    .eq('phone_hash', phoneHash)
    .maybeSingle();

  if (existing && !existing.opted_out_at) {
    // Already registered — remind them of their status
    const name = (existing.display_name as string | null) ?? contactName ?? 'du';
    await sendText(
      templates['already_registered']
        ?? `Hej ${name}! Du bist bereits Mitglied. 😊\nSchreibe *Stempel* nach deinem nächsten Besuch.`,
    );
    return;
  }

  const displayName = contactName ?? 'Gast';
  let customerId: string;
  let walletToken: string | null = null;

  if (existing?.opted_out_at) {
    // Re-opt-in
    await supabase
      .from('customers')
      .update({
        phone_enc: phoneEnc,
        display_name: displayName,
        wa_contact_name: contactName,
        opted_out_at: null,
        opted_in_at: new Date().toISOString(),
        opt_in_ip: null,
        ...(referralCode ? { referred_by_code: referralCode } : {}),
      })
      .eq('id', existing.id);
    customerId  = existing.id;
    walletToken = existing.wallet_token as string | null;
  } else {
    // New customer — generate customer_code
    const customerCode = await generateUniqueCustomerCode(business.id);

    const { data: newCust } = await supabase
      .from('customers')
      .insert({
        business_id: business.id,
        phone_enc: phoneEnc,
        phone_hash: phoneHash,
        display_name: displayName,
        wa_contact_name: contactName,
        opted_in_at: new Date().toISOString(),
        customer_code: customerCode,
        ...(referralCode ? { referred_by_code: referralCode } : {}),
      })
      .select('id, wallet_token')
      .single();

    if (!newCust) {
      logger.error({ businessId: business.id }, 'Failed to insert new customer');
      return;
    }
    customerId  = newCust.id as string;
    walletToken = newCust.wallet_token as string | null;
  }

  // Build wallet URL for the welcome message CTA
  const walletUrl = walletToken && biz.slug && env.CLIENT_URL
    ? `${env.CLIENT_URL}/r/${biz.slug}/wallet/${walletToken}`
    : undefined;

  const welcomeMsg = optInWelcomeText(
    e164,
    displayName,
    biz.business_name,
    walletUrl,
    templates['opt_in_welcome'] ?? undefined,
    templates['opt_in_welcome_cta'] ?? undefined,
  );

  const { to: _to, ...welcomeBody } = { ...welcomeMsg, to: e164 };
  const waMessageId = await sendMessage(phoneNumberId, biz.wa_access_token_enc, phoneEnc, welcomeBody);

  await supabase.from('notification_logs').insert({
    business_id: business.id,
    customer_id: customerId,
    event_type: 'opt_in',
    status: 'sent',
    ...(waMessageId !== null ? { wa_message_id: waMessageId } : {}),
  });

  logger.info({ businessId: business.id, customerId }, 'Customer registered via WhatsApp keyword');
}

// ── Unique customer code generator (same logic as public.controller.ts) ───────

async function generateUniqueCustomerCode(_businessId: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const digits = attempt < 15 ? 4 : 6;
    const min    = Math.pow(10, digits - 1);
    const max    = Math.pow(10, digits) - 1;
    const code   = String(Math.floor(min + Math.random() * (max - min + 1)));
    const { data } = await supabase
      .from('customers')
      .select('id')
      .eq('customer_code', code)
      .maybeSingle();
    if (!data) return code;
  }
  return String(Date.now()).slice(-8);
}

// ── Stempel-Anfrage (Approval Flow) ─────────────────────────────────────────

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
  const e164      = `+${fromPhone}`;
  const phoneHash = hashPhone(e164);

  const { data: customer } = await supabase
    .from('customers')
    .select('id, phone_enc, total_stamps')
    .eq('business_id', business.id)
    .eq('phone_hash', phoneHash)
    .is('opted_out_at', null)
    .maybeSingle();

  const { data: biz } = await supabase
    .from('businesses')
    .select('wa_access_token_enc, slug, message_templates, wa_phone_number')
    .eq('id', business.id)
    .single();

  if (!biz?.wa_access_token_enc) return;

  const templates = (biz.message_templates as Record<string, string> | null) ?? {};

  // Unknown customer → prompt to register
  if (!customer) {
    const waNumber = (biz.wa_phone_number as string | null) ?? null;
    const regUrl   = biz.slug
      ? `${env.CLIENT_URL ?? ''}/r/${biz.slug}`
      : null;

    const bodyText = templates['not_registered']
      ?? 'Du bist noch nicht registriert. Melde dich über den Link an! 🎉';

    const body = regUrl
      ? {
          messaging_product: 'whatsapp' as const,
          recipient_type: 'individual' as const,
          type: 'interactive' as const,
          interactive: {
            type: 'cta_url' as const,
            body: { text: bodyText },
            action: { name: 'cta_url' as const, parameters: {
              display_text: templates['not_registered_cta'] ?? 'Jetzt registrieren',
              url: regUrl,
            }},
          },
        }
      : {
          messaging_product: 'whatsapp' as const,
          recipient_type: 'individual' as const,
          type: 'text' as const,
          text: { body: bodyText },
        };

    const tmpEnc = encryptPhone(e164);
    void waNumber; // wa_phone_number not needed for sending
    await sendMessage(phoneNumberId, biz.wa_access_token_enc, tmpEnc, body);
    return;
  }

  // Create pending stamp_request
  const result = await createStampRequest(business.id, customer.id);

  const sendText = async (body: string): Promise<void> => {
    const { to: _to, ...msg } = {
      messaging_product: 'whatsapp' as const,
      recipient_type: 'individual' as const,
      to: e164,
      type: 'text' as const,
      text: { body },
    };
    await sendMessage(phoneNumberId, biz.wa_access_token_enc!, customer.phone_enc, msg);
  };

  if (result.status === 'duplicate') {
    await sendText('Deine Anfrage wird gerade bearbeitet. Bitte hab einen Moment Geduld. ⏳');
    return;
  }

  const stampCount  = business.stamp_count ?? business.stamps_per_reward;
  const pendingText = templates['stamp_request_pending']
    ?? `Deine Stempel-Anfrage wurde empfangen! ✅\n\n📍 Aktuell: ${customer.total_stamps}/${stampCount} Stempel\n\nDer Betreiber bestätigt sie gleich.`;

  await sendText(pendingText);
  logger.info({ businessId: business.id, customerId: customer.id }, 'Stamp request created');
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
    .select('wa_access_token_enc, message_templates')
    .eq('id', businessId)
    .single();

  if (biz?.wa_access_token_enc) {
    const customBody = (biz.message_templates as Record<string, string> | null)?.['opt_out_confirm'];
    const tmpEnc = encryptPhone(e164);
    const { to: _to, ...body } = optOutConfirmText(e164, customBody);
    await sendMessage(phoneNumberId, biz.wa_access_token_enc, tmpEnc, body);
  }

  logger.info({ businessId, customerId: customer.id }, 'Customer opted out');
}

// ── Status-Updates ───────────────────────────────────────────────────────────

async function handleStatusUpdate(status: MessageStatus): Promise<void> {
  if (!status.id) return;
  await Promise.all([
    supabase
      .from('notification_logs')
      .update({ status: status.status })
      .eq('wa_message_id', status.id),
    supabase
      .from('wa_messages')
      .update({ status: status.status })
      .eq('wa_message_id', status.id),
  ]);
}
