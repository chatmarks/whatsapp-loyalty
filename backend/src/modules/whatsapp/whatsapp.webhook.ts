import { supabase } from '../../config/supabase.js';
import { hashPhone, encryptPhone } from '../../lib/crypto.js';
import { logger } from '../../lib/logger.js';
import { findBusinessByWaPhoneId, sendMessage } from './whatsapp.service.js';
import { optOutConfirmText } from './whatsapp.templates.js';
import { createStampRequest } from '../stamp-requests/stamp-requests.service.js';
import type { WebhookPayload, InboundMessage, MessageStatus } from '../../types/whatsapp.js';

const OPT_OUT_KEYWORDS = new Set(['stop', 'abmelden', 'nein', 'stopp']);
const STAMP_KEYWORDS   = new Set(['stempel', 'stamp']);

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

// ── Stempel-Anfrage (Approval Flow) ─────────────────────────────────────────
// Keyword "Stempel"/"Stamp" creates a pending stamp_request instead of
// auto-issuing. The operator approves/declines via the dashboard modal.

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

  // Find customer by phone hash
  const { data: customer } = await supabase
    .from('customers')
    .select('id, phone_enc, total_stamps')
    .eq('business_id', business.id)
    .eq('phone_hash', phoneHash)
    .is('opted_out_at', null)
    .maybeSingle();

  const { data: biz } = await supabase
    .from('businesses')
    .select('wa_access_token_enc, slug, message_templates')
    .eq('id', business.id)
    .single();

  if (!biz?.wa_access_token_enc) return;

  const templates = (biz.message_templates as Record<string, string> | null) ?? {};

  // Unknown customer → registration prompt
  if (!customer) {
    const tmpEnc = encryptPhone(e164);
    const regUrl = biz.slug ? `${process.env['CLIENT_URL'] ?? ''}/r/${biz.slug}` : null;
    const bodyText = templates['not_registered']
      ?? 'Du bist noch nicht registriert. Melde dich hier an und sammle Stempel! 🎉';

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

    await sendMessage(phoneNumberId, biz.wa_access_token_enc, tmpEnc, body);
    return;
  }

  // Create pending stamp_request (service handles cooldown + dedup)
  const result = await createStampRequest(business.id, customer.id);

  const sendText = async (body: string): Promise<void> => {
    const { to: _to, ...msg } = {
      messaging_product: 'whatsapp' as const,
      recipient_type: 'individual' as const,
      to: e164,
      type: 'text' as const,
      text: { body },
    };
    await sendMessage(phoneNumberId, biz.wa_access_token_enc, customer.phone_enc, msg);
  };

  if (result.status === 'duplicate') {
    await sendText('Deine Anfrage wird gerade bearbeitet. Bitte hab einen Moment Geduld. ⏳');
    return;
  }

  // status === 'created' → notify customer that request is pending
  const stampCount = business.stamp_count ?? business.stamps_per_reward;
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
