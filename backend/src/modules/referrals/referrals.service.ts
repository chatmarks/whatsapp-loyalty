/**
 * Referral bonus module — isolated trigger for clean tracking.
 *
 * Trigger condition: a referred customer receives their very first stamp ever
 * (lifetime_stamps was 0 before the stamp was issued).
 *
 * Reward: +1 stamp (source = 'referral') to both:
 *   - the referred customer (newcomer bonus)
 *   - the referrer (thank-you bonus)
 *
 * Idempotency: referral_reward_at is set atomically first to prevent double-issue.
 */

import { supabase } from '../../config/supabase.js';
import { logger } from '../../lib/logger.js';

export async function triggerReferralBonus(
  businessId: string,
  customerId: string,
  stampCount: number,
): Promise<void> {
  // Load customer with referral tracking fields
  const { data: cust } = await supabase
    .from('customers')
    .select('referred_by_code, referral_reward_at, total_stamps, lifetime_stamps')
    .eq('id', customerId)
    .single();

  // No referral to process, or bonus already issued
  if (!cust?.referred_by_code || cust.referral_reward_at) return;

  // Atomically claim the bonus slot — prevents double-issue under concurrent requests.
  // The .is('referral_reward_at', null) acts as an optimistic lock.
  const { data: claimed } = await supabase
    .from('customers')
    .update({ referral_reward_at: new Date().toISOString() })
    .eq('id', customerId)
    .is('referral_reward_at', null)
    .select('id');

  // Another process claimed it first → skip
  if (!claimed?.length) return;

  // ── +1 referral stamp to the referred customer ───────────────────────────

  const refNewTotal = (cust.total_stamps as number) + 1;
  const refFinalTotal = refNewTotal >= stampCount ? refNewTotal % stampCount : refNewTotal;

  await supabase
    .from('customers')
    .update({
      total_stamps: refFinalTotal,
      lifetime_stamps: (cust.lifetime_stamps as number) + 1,
    })
    .eq('id', customerId);

  await supabase.from('stamp_events').insert({
    business_id: businessId,
    customer_id: customerId,
    amount: 1,
    source: 'referral',
    issued_by: businessId,
  });

  // ── +1 referral stamp to the referrer ────────────────────────────────────

  const { data: referrer } = await supabase
    .from('customers')
    .select('id, total_stamps, lifetime_stamps')
    .eq('business_id', businessId)
    .eq('customer_code', cust.referred_by_code)
    .is('opted_out_at', null)
    .maybeSingle();

  if (!referrer) {
    logger.warn({ businessId, customerId, code: cust.referred_by_code }, 'Referrer not found — skipping referrer bonus');
    return;
  }

  const rrNewTotal = (referrer.total_stamps as number) + 1;
  const rrFinalTotal = rrNewTotal >= stampCount ? rrNewTotal % stampCount : rrNewTotal;

  await supabase
    .from('customers')
    .update({
      total_stamps: rrFinalTotal,
      lifetime_stamps: (referrer.lifetime_stamps as number) + 1,
      last_interaction_at: new Date().toISOString(),
    })
    .eq('id', referrer.id);

  await supabase.from('stamp_events').insert({
    business_id: businessId,
    customer_id: referrer.id,
    amount: 1,
    source: 'referral',
    issued_by: businessId,
  });

  logger.info(
    { businessId, customerId, referrerId: referrer.id },
    'Referral bonus triggered: +1 stamp issued to both parties',
  );
}
