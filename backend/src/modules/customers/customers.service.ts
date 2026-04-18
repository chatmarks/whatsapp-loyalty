import { supabase } from '../../config/supabase.js';
import { maskPhone, decryptPhone } from '../../lib/crypto.js';
import { NotFoundError } from '../../lib/errors.js';
import { sendMessage } from '../whatsapp/whatsapp.service.js';
import type { SafeCustomer, PaginatedResponse } from '../../types/api.js';
import type { ListCustomersInput } from './customers.schema.js';
import type { Business } from '../../types/database.js';

function toSafeCustomer(row: Record<string, unknown>): SafeCustomer {
  // Decrypt only to produce masked display — plaintext never leaves this function
  let phoneMasked = '***';
  if (typeof row.phone_enc === 'string' && row.phone_enc !== '[REDACTED]') {
    try {
      const plain = decryptPhone(row.phone_enc);
      phoneMasked = maskPhone(plain);
    } catch {
      phoneMasked = '***';
    }
  }
  const { phone_enc: _, phone_hash: __, ...rest } = row;
  void _;
  void __;
  return { ...rest, phone_display: phoneMasked } as SafeCustomer;
}

export async function listCustomers(
  businessId: string,
  input: ListCustomersInput,
): Promise<PaginatedResponse<SafeCustomer>> {
  const offset = (input.page - 1) * input.pageSize;

  let query = supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .range(offset, offset + input.pageSize - 1);

  if (input.search) {
    // Search by display_name — never search phone directly
    query = query.ilike('display_name', `%${input.search}%`);
  }

  if (input.optedOut === 'false') query = query.is('opted_out_at', null);
  if (input.optedOut === 'true') query = query.not('opted_out_at', 'is', null);

  const { data, count, error } = await query;
  if (error) throw new Error('Failed to fetch customers');

  return {
    data: (data ?? []).map((r) => toSafeCustomer(r as Record<string, unknown>)),
    total: count ?? 0,
    page: input.page,
    pageSize: input.pageSize,
  };
}

export async function getCustomer(businessId: string, customerId: string): Promise<SafeCustomer> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .eq('business_id', businessId)
    .single();

  if (error || !data) throw new NotFoundError('Customer');
  return toSafeCustomer(data as Record<string, unknown>);
}

export interface WaMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  status: string;
  created_at: string;
}

export async function listMessages(
  businessId: string,
  customerId: string,
  page: number,
): Promise<PaginatedResponse<WaMessage>> {
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  const { data, count } = await supabase
    .from('wa_messages')
    .select('id, direction, body, status, created_at', { count: 'exact' })
    .eq('business_id', businessId)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  return {
    data: (data ?? []) as WaMessage[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function sendMessageToCustomer(
  business: Pick<Business, 'id' | 'business_name' | 'plan' | 'wa_phone_number_id'>,
  customerId: string,
  body: string,
): Promise<void> {
  const { data: customer } = await supabase
    .from('customers')
    .select('id, phone_enc')
    .eq('id', customerId)
    .eq('business_id', business.id)
    .is('opted_out_at', null)
    .single();

  if (!customer) throw new NotFoundError('Customer');

  const { data: biz } = await supabase
    .from('businesses')
    .select('wa_access_token_enc, wa_phone_number_id')
    .eq('id', business.id)
    .single();

  if (!biz?.wa_access_token_enc || !biz.wa_phone_number_id) {
    throw new Error('WhatsApp not configured');
  }

  const { to: _to, ...msgBody } = {
    messaging_product: 'whatsapp' as const,
    recipient_type: 'individual' as const,
    to: 'placeholder' as const,
    type: 'text' as const,
    text: { body },
  };
  const waMessageId = await sendMessage(
    biz.wa_phone_number_id,
    biz.wa_access_token_enc,
    customer.phone_enc,
    msgBody,
  );

  await supabase.from('wa_messages').insert({
    business_id: business.id,
    customer_id: customerId,
    direction: 'outbound',
    body,
    wa_message_id: waMessageId ?? null,
    status: 'sent',
  });
}

/**
 * DSGVO deletion: anonymise PII in-place, retain business analytics.
 * Hard-delete scheduled after 30-day retention by a cron job.
 */
export async function deleteCustomer(businessId: string, customerId: string): Promise<void> {
  const { error } = await supabase
    .from('customers')
    .update({
      phone_enc: '[REDACTED]',
      display_name: null,
      wa_contact_name: null,
      opt_in_ip: null,
      notes: null,
      opted_out_at: new Date().toISOString(),
    })
    .eq('id', customerId)
    .eq('business_id', businessId);

  if (error) throw new Error('Failed to anonymise customer');
}
