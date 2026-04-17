import { supabase } from '../../config/supabase.js';
import { decryptPhone } from '../../lib/crypto.js';
import { logger } from '../../lib/logger.js';
import type { SendMessageRequest, SendMessageResponse } from '../../types/whatsapp.js';

const META_API_BASE = 'https://graph.facebook.com/v21.0';

/**
 * Sends a WhatsApp message via Meta Cloud API.
 * Decrypts phone in-memory, calls API, immediately discards plaintext.
 * Never logs phone or message content.
 */
export async function sendMessage(
  phoneNumberId: string,
  accessTokenEnc: string,
  recipientPhoneEnc: string,
  body: Omit<SendMessageRequest, 'to'>,
): Promise<string | null> {
  let recipientPhone: string;
  try {
    recipientPhone = decryptPhone(recipientPhoneEnc);
  } catch {
    logger.error('Failed to decrypt recipient phone — skipping send');
    return null;
  }

  // Decrypt WA access token
  let accessToken: string;
  try {
    accessToken = decryptPhone(accessTokenEnc); // reuses AES-GCM decrypt
  } catch {
    logger.error('Failed to decrypt WA access token — skipping send');
    recipientPhone = ''; // discard
    return null;
  }

  const payload: SendMessageRequest = { ...body, to: recipientPhone } as SendMessageRequest;
  recipientPhone = ''; // discard plaintext immediately

  try {
    const response = await fetch(`${META_API_BASE}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    accessToken = ''; // discard token

    if (!response.ok) {
      const errText = await response.text();
      // Truncate error — may contain partial PII in some Meta error messages
      logger.error({ status: response.status, errSnippet: errText.slice(0, 100) }, 'Meta API error');
      return null;
    }

    const data = (await response.json()) as SendMessageResponse;
    return data.messages[0]?.id ?? null;
  } catch (err) {
    accessToken = '';
    logger.error({ err }, 'Network error sending WhatsApp message');
    return null;
  }
}

/**
 * Looks up business by wa_phone_number_id for webhook routing.
 */
export async function findBusinessByWaPhoneId(
  phoneNumberId: string,
): Promise<{
  id: string;
  business_name: string;
  slug: string;
  stamps_per_reward: number;
  reward_description: string;
  stamp_count: number;
  reward_stages: Array<{ stamp: number; description: string }> | null;
} | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, business_name, slug, stamps_per_reward, reward_description, stamp_count, reward_stages')
    .eq('wa_phone_number_id', phoneNumberId)
    .eq('active', true)
    .maybeSingle();

  if (error) {
    logger.error({ error, phoneNumberId }, 'DB error in findBusinessByWaPhoneId');
    return null;
  }

  return data ?? null;
}
