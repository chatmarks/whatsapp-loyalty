import { supabase } from '../../config/supabase.js';
import { encryptPhone } from '../../lib/crypto.js';
import { NotFoundError } from '../../lib/errors.js';
import type { BusinessStats } from '../../types/api.js';
import type { Business } from '../../types/database.js';
import type { UpdateBusinessInput, UpdateWhatsAppInput } from './businesses.schema.js';

// Columns safe to return to the client (excludes secrets)
const SAFE_COLUMNS = [
  'id', 'owner_email', 'business_name', 'slug', 'phone_display',
  'wa_phone_number_id', 'stripe_subscription_id', 'plan',
  'stamps_per_reward', 'reward_description', 'stamp_count', 'reward_stages',
  'blast_count_this_week',
  'logo_url', 'banner_url', 'primary_color', 'secondary_color',
  'youtube_url', 'timezone', 'locale', 'active', 'message_templates', 'created_at', 'updated_at',
].join(', ');

export async function getMyBusiness(businessId: string): Promise<Partial<Business>> {
  const { data, error } = await supabase
    .from('businesses')
    .select(SAFE_COLUMNS)
    .eq('id', businessId)
    .single();

  if (error || !data) throw new NotFoundError('Business');
  return data as Partial<Business>;
}

export async function updateBusiness(
  businessId: string,
  input: UpdateBusinessInput,
): Promise<Partial<Business>> {
  const updates: Record<string, unknown> = {};
  if (input.businessName !== undefined) updates.business_name = input.businessName;
  if (input.slug !== undefined) updates.slug = input.slug;
  if (input.phoneDisplay !== undefined) updates.phone_display = input.phoneDisplay;
  if (input.logoUrl !== undefined) updates.logo_url = input.logoUrl;
  if (input.bannerUrl !== undefined) updates.banner_url = input.bannerUrl;
  if (input.primaryColor !== undefined) updates.primary_color = input.primaryColor;
  if (input.secondaryColor !== undefined) updates.secondary_color = input.secondaryColor;
  if (input.youtubeUrl !== undefined) updates.youtube_url = input.youtubeUrl;
  if (input.stampsPerReward !== undefined) updates.stamps_per_reward = input.stampsPerReward;
  if (input.rewardDescription !== undefined) updates.reward_description = input.rewardDescription;
  if (input.stampCount !== undefined) updates.stamp_count = input.stampCount;
  if (input.rewardStages !== undefined) updates.reward_stages = input.rewardStages;
  if (input.timezone !== undefined) updates.timezone = input.timezone;
  if (input.messageTemplates !== undefined) updates.message_templates = input.messageTemplates;

  const { data, error } = await supabase
    .from('businesses')
    .update(updates)
    .eq('id', businessId)
    .select(SAFE_COLUMNS)
    .single();

  if (error || !data) throw new NotFoundError('Business');
  return data as Partial<Business>;
}

export async function updateWhatsApp(
  businessId: string,
  input: UpdateWhatsAppInput,
): Promise<void> {
  // Encrypt the WA access token before storing
  const tokenEnc = encryptPhone(input.waAccessToken);

  const { error } = await supabase
    .from('businesses')
    .update({
      wa_phone_number_id: input.waPhoneNumberId,
      wa_access_token_enc: tokenEnc,
    })
    .eq('id', businessId);

  if (error) throw new Error('Failed to update WhatsApp config');
}

export async function getStats(businessId: string): Promise<BusinessStats> {
  const [members, orders, stamps, vouchers] = await Promise.all([
    supabase.from('customers').select('id', { count: 'exact', head: true })
      .eq('business_id', businessId).is('opted_out_at', null),
    supabase.from('orders').select('id', { count: 'exact', head: true })
      .eq('business_id', businessId),
    supabase.from('stamp_events').select('amount').eq('business_id', businessId),
    supabase.from('vouchers').select('id, redeemed_at, claimed_at')
      .eq('business_id', businessId),
  ]);

  const stampTotal = (stamps.data ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
  const voucherRows = vouchers.data ?? [];
  const vouchersActive = voucherRows.filter((v) => !v.redeemed_at && !v.claimed_at).length;
  const vouchersIssued = voucherRows.length;
  const vouchersClaimed = voucherRows.filter((v) => v.claimed_at).length;

  return {
    memberCount: members.count ?? 0,
    orderCount: orders.count ?? 0,
    stampTotal,
    vouchersActive,
    vouchersIssued,
    vouchersClaimed,
  };
}
