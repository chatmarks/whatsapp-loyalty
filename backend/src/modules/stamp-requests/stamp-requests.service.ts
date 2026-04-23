import { supabase } from '../../config/supabase.js';
import { maskPhone, decryptPhone } from '../../lib/crypto.js';
import { NotFoundError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { issueStamps } from '../stamps/stamps.service.js';

export interface PendingRequest {
  id: string;
  created_at: string;
  customer_id: string;
  display_name: string | null;
  wa_contact_name: string | null;
  phone_display: string;
  total_stamps: number;
  stamp_count: number;
  primary_color: string;
  reward_stages: Array<{ stamp: number; description: string; emoji?: string }>;
}

export type CreateResult = { status: 'created' } | { status: 'duplicate' };

/**
 * Create a pending stamp request for a customer.
 * No cooldown — operators decide how many stamps to award.
 * Only deduplicates: if a request is already pending for this customer, returns 'duplicate'.
 */
export async function createStampRequest(
  businessId: string,
  customerId: string,
): Promise<CreateResult> {
  // Check for existing pending request
  const { data: existingPending } = await supabase
    .from('stamp_requests')
    .select('id')
    .eq('business_id', businessId)
    .eq('customer_id', customerId)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingPending) return { status: 'duplicate' };

  const { error } = await supabase.from('stamp_requests').insert({
    business_id: businessId,
    customer_id: customerId,
    status: 'pending',
  });

  if (error) {
    logger.error({ error }, 'Failed to create stamp_request');
    throw new Error('Failed to create stamp request');
  }

  return { status: 'created' };
}

/** Return all pending requests for a business, enriched with customer + business data. */
export async function listPending(businessId: string): Promise<PendingRequest[]> {
  const { data, error } = await supabase
    .from('stamp_requests')
    .select(`
      id,
      created_at,
      customer_id,
      customer:customers(
        phone_enc,
        display_name,
        wa_contact_name,
        total_stamps
      )
    `)
    .eq('business_id', businessId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw new Error('Failed to fetch stamp requests');

  const { data: biz } = await supabase
    .from('businesses')
    .select('stamp_count, stamps_per_reward, primary_color, reward_stages')
    .eq('id', businessId)
    .single();

  if (!biz) return [];

  const stampCount: number = biz.stamp_count ?? biz.stamps_per_reward ?? 10;
  const rewardStages = (biz.reward_stages as PendingRequest['reward_stages'] | null) ?? [];
  const primaryColor = (biz.primary_color as string | null) ?? '#25D366';

  return (data ?? []).map((row) => {
    const cust = (row.customer as unknown) as Record<string, unknown> | null;
    let phoneDisplay = '***';
    if (typeof cust?.['phone_enc'] === 'string' && cust['phone_enc'] !== '[REDACTED]') {
      try {
        phoneDisplay = maskPhone(decryptPhone(cust['phone_enc']));
      } catch { /* keep *** */ }
    }

    return {
      id: row.id as string,
      created_at: row.created_at as string,
      customer_id: row.customer_id as string,
      display_name: (cust?.['display_name'] as string | null) ?? null,
      wa_contact_name: (cust?.['wa_contact_name'] as string | null) ?? null,
      phone_display: phoneDisplay,
      total_stamps: (cust?.['total_stamps'] as number | null) ?? 0,
      stamp_count: stampCount,
      primary_color: primaryColor,
      reward_stages: rewardStages,
    };
  });
}

/** Approve a pending request: issue 1 stamp + notify customer via WhatsApp. */
export async function approveRequest(
  businessId: string,
  requestId: string,
): Promise<void> {
  const { data: request, error } = await supabase
    .from('stamp_requests')
    .select('id, customer_id, status')
    .eq('id', requestId)
    .eq('business_id', businessId)
    .eq('status', 'pending')
    .single();

  if (error || !request) throw new NotFoundError('StampRequest');

  // Mark approved first to prevent double-approval
  await supabase
    .from('stamp_requests')
    .update({ status: 'approved', resolved_at: new Date().toISOString() })
    .eq('id', requestId);

  // Issue stamp and send WhatsApp notification to customer
  await issueStamps(businessId, {
    customerId: request.customer_id as string,
    amount: 1,
    notifyWhatsApp: true,
  });
}

/** Decline a pending request silently — no WhatsApp message sent to customer. */
export async function declineRequest(
  businessId: string,
  requestId: string,
): Promise<void> {
  const { error } = await supabase
    .from('stamp_requests')
    .update({ status: 'declined', resolved_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('business_id', businessId)
    .eq('status', 'pending');

  if (error) throw new Error('Failed to decline request');
}
