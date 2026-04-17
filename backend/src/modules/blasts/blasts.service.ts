import { supabase } from '../../config/supabase.js';
import { BusinessRuleError, NotFoundError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import type { BlastCampaign } from '../../types/database.js';
import type { CreateBlastInput } from './blasts.schema.js';

const MAX_BLASTS_PER_WEEK = 2;

async function resolveAudience(businessId: string, audience: string): Promise<string[]> {
  if (audience === 'all') {
    const { data } = await supabase
      .from('customers')
      .select('id')
      .eq('business_id', businessId)
      .is('opted_out_at', null);
    return (data ?? []).map((r) => r.id as string);
  }

  if (audience === 'inactive_30') {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('customers')
      .select('id')
      .eq('business_id', businessId)
      .is('opted_out_at', null)
      .lt('last_interaction_at', cutoff);
    return (data ?? []).map((r) => r.id as string);
  }

  if (audience.startsWith('tier:')) {
    const tierId = audience.slice(5);
    const { data } = await supabase
      .from('customers')
      .select('id')
      .eq('business_id', businessId)
      .eq('current_tier_id', tierId)
      .is('opted_out_at', null);
    return (data ?? []).map((r) => r.id as string);
  }

  return [];
}

export async function listBlasts(businessId: string): Promise<BlastCampaign[]> {
  const { data, error } = await supabase
    .from('blast_campaigns')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Failed to fetch blasts');
  return (data ?? []) as BlastCampaign[];
}

export async function createBlast(
  businessId: string,
  input: CreateBlastInput,
): Promise<BlastCampaign> {
  const recipientIds = await resolveAudience(businessId, input.audience);

  const { data, error } = await supabase
    .from('blast_campaigns')
    .insert({
      business_id: businessId,
      name: input.name,
      template_name: input.templateName,
      template_params: input.templateParams ?? null,
      audience: input.audience,
      recipient_count: recipientIds.length,
      scheduled_at: input.scheduledAt ?? null,
    })
    .select('*')
    .single();

  if (error || !data) throw new Error('Failed to create blast');
  return data as BlastCampaign;
}

export async function sendBlast(businessId: string, blastId: string): Promise<void> {
  // Enforce 2 blasts/week limit
  const { data: business } = await supabase
    .from('businesses')
    .select('blast_count_this_week, blast_week_reset_at, wa_phone_number_id')
    .eq('id', businessId)
    .single();

  if (!business) throw new NotFoundError('Business');

  // Reset weekly counter if past Monday UTC
  const now = new Date();
  const resetDate = business.blast_week_reset_at ? new Date(business.blast_week_reset_at) : null;
  const mondayThisWeek = new Date(now);
  mondayThisWeek.setUTCDate(now.getUTCDate() - now.getUTCDay() + 1);
  mondayThisWeek.setUTCHours(0, 0, 0, 0);

  const needsReset = !resetDate || resetDate < mondayThisWeek;
  const currentCount = needsReset ? 0 : business.blast_count_this_week;

  if (currentCount >= MAX_BLASTS_PER_WEEK) {
    throw new BusinessRuleError(
      `Maximum ${MAX_BLASTS_PER_WEEK} blasts per week reached. Resets on Monday.`,
    );
  }

  // Mark as sending
  await supabase
    .from('blast_campaigns')
    .update({ status: 'sending' })
    .eq('id', blastId)
    .eq('business_id', businessId);

  // Increment counter
  await supabase
    .from('businesses')
    .update({
      blast_count_this_week: currentCount + 1,
      blast_week_reset_at: needsReset ? now.toISOString() : business.blast_week_reset_at,
    })
    .eq('id', businessId);

  // Actual sending delegated to WhatsApp service
  // WhatsApp service reads blast record and sends to each recipient
  logger.info({ blastId, businessId }, 'Blast send initiated');

  await supabase
    .from('blast_campaigns')
    .update({ status: 'sent', sent_at: now.toISOString() })
    .eq('id', blastId);
}

export async function deleteBlast(businessId: string, blastId: string): Promise<void> {
  const { error } = await supabase
    .from('blast_campaigns')
    .delete()
    .eq('id', blastId)
    .eq('business_id', businessId)
    .eq('status', 'draft');

  if (error) throw new NotFoundError('Blast campaign');
}
