import { supabase } from '../../config/supabase.js';
import { NotFoundError } from '../../lib/errors.js';
import type { MembershipTier } from '../../types/database.js';
import type { CreateTierInput, UpdateTierInput } from './membership.schema.js';

export async function listTiers(businessId: string): Promise<MembershipTier[]> {
  const { data, error } = await supabase
    .from('membership_tiers')
    .select('*')
    .eq('business_id', businessId)
    .order('sort_order');

  if (error) throw new Error('Failed to fetch tiers');
  return (data ?? []) as MembershipTier[];
}

export async function createTier(businessId: string, input: CreateTierInput): Promise<MembershipTier> {
  const { data, error } = await supabase
    .from('membership_tiers')
    .insert({
      business_id: businessId,
      name: input.name,
      min_lifetime_stamps: input.minLifetimeStamps,
      stamp_multiplier: input.stampMultiplier,
      perks: input.perks,
      badge_color: input.badgeColor ?? null,
      sort_order: input.sortOrder,
    })
    .select('*')
    .single();

  if (error || !data) throw new Error('Failed to create tier');
  return data as MembershipTier;
}

export async function updateTier(
  businessId: string,
  tierId: string,
  input: UpdateTierInput,
): Promise<MembershipTier> {
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.minLifetimeStamps !== undefined) updates.min_lifetime_stamps = input.minLifetimeStamps;
  if (input.stampMultiplier !== undefined) updates.stamp_multiplier = input.stampMultiplier;
  if (input.perks !== undefined) updates.perks = input.perks;
  if (input.badgeColor !== undefined) updates.badge_color = input.badgeColor;
  if (input.sortOrder !== undefined) updates.sort_order = input.sortOrder;

  const { data, error } = await supabase
    .from('membership_tiers')
    .update(updates)
    .eq('id', tierId)
    .eq('business_id', businessId)
    .select('*')
    .single();

  if (error || !data) throw new NotFoundError('Membership tier');
  return data as MembershipTier;
}

export async function deleteTier(businessId: string, tierId: string): Promise<void> {
  const { error } = await supabase
    .from('membership_tiers')
    .delete()
    .eq('id', tierId)
    .eq('business_id', businessId);

  if (error) throw new NotFoundError('Membership tier');
}

/**
 * Evaluates which tier a customer qualifies for based on lifetime stamps.
 * Called after every stamp issuance to keep tier current.
 */
export async function evaluateTier(businessId: string, customerId: string): Promise<void> {
  const [tiersRes, customerRes] = await Promise.all([
    supabase
      .from('membership_tiers')
      .select('id, min_lifetime_stamps')
      .eq('business_id', businessId)
      .order('min_lifetime_stamps', { ascending: false }),
    supabase
      .from('customers')
      .select('lifetime_stamps')
      .eq('id', customerId)
      .single(),
  ]);

  if (!customerRes.data || !tiersRes.data?.length) return;

  const { lifetime_stamps } = customerRes.data;
  const qualifiedTier = tiersRes.data.find(
    (t) => lifetime_stamps >= t.min_lifetime_stamps,
  );

  await supabase
    .from('customers')
    .update({ current_tier_id: qualifiedTier?.id ?? null })
    .eq('id', customerId);
}
