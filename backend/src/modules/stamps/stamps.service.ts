import { supabase } from '../../config/supabase.js';
import { NotFoundError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { env } from '../../config/env.js';
import { sendMessage } from '../whatsapp/whatsapp.service.js';
import { rewardEarnedText, stampIssuedText } from '../whatsapp/whatsapp.templates.js';
import type { IssueStampsInput } from './stamps.schema.js';

export interface RewardStage {
  stamp: number;
  description: string;
}

export interface IssueStampsResult {
  newTotal: number;
  lifetimeTotal: number;
  rewardIssued: boolean;
  /** All voucher codes issued this transaction (one per crossed reward stage) */
  voucherCodes: string[];
  /** First code — kept for backward-compat with UI that expects voucherCode */
  voucherCode?: string;
}

/**
 * Determine which reward stages were crossed when going from prevTotal to newTotal
 * within a single card cycle bounded by stampCount.
 */
function crossedStages(
  prevTotal: number,
  newTotal: number,
  stages: RewardStage[],
  stampCount: number,
): RewardStage[] {
  // Stages crossed in the current card cycle
  const inCycle = stages.filter(
    (s) => s.stamp > prevTotal && s.stamp <= Math.min(newTotal, stampCount),
  );

  // If we reached or passed stampCount, the card resets; check stages
  // in the new cycle (0..overflow). We only handle one reset per issue.
  if (newTotal >= stampCount) {
    const overflow = newTotal % stampCount;
    const nextCycle = overflow > 0
      ? stages.filter((s) => s.stamp <= overflow)
      : [];
    return [...inCycle, ...nextCycle];
  }

  return inCycle;
}

/**
 * Issues stamps to a customer and auto-issues reward vouchers for every
 * reward stage threshold that is crossed. All DB writes are sequential but
 * structured to be safe under concurrent requests via unique constraints.
 */
export async function issueStamps(
  businessId: string,
  input: IssueStampsInput,
): Promise<IssueStampsResult> {
  // Verify customer belongs to this business
  const { data: customer } = await supabase
    .from('customers')
    .select('id, total_stamps, lifetime_stamps, phone_enc, wallet_token')
    .eq('id', input.customerId)
    .eq('business_id', businessId)
    .is('opted_out_at', null)
    .single();

  if (!customer) throw new NotFoundError('Customer');

  const { data: business } = await supabase
    .from('businesses')
    .select('stamp_count, reward_stages, stamps_per_reward, reward_description, wa_phone_number_id, wa_access_token_enc, slug, primary_color, message_templates')
    .eq('id', businessId)
    .single();

  if (!business) throw new NotFoundError('Business');

  // Prefer the new stamp_count field; fall back to stamps_per_reward for
  // rows that predate the 007 migration.
  const stampCount: number = business.stamp_count ?? business.stamps_per_reward;
  const stages: RewardStage[] = (business.reward_stages as RewardStage[] | null) ?? [
    { stamp: stampCount, description: business.reward_description },
  ];

  const prevTotal = customer.total_stamps;
  const newTotal  = prevTotal + input.amount;
  const newLifetime = customer.lifetime_stamps + input.amount;

  const crossed = crossedStages(prevTotal, newTotal, stages, stampCount);
  const rewardIssued = crossed.length > 0;

  // Compute the final total after potential card reset
  const finalTotal = newTotal >= stampCount ? newTotal % stampCount : newTotal;

  // Update customer stamp counters
  const { error: updateError } = await supabase
    .from('customers')
    .update({
      total_stamps: finalTotal,
      lifetime_stamps: newLifetime,
      last_interaction_at: new Date().toISOString(),
    })
    .eq('id', input.customerId);

  if (updateError) throw new Error('Failed to update stamp count');

  // Insert stamp event
  const { error: eventError } = await supabase
    .from('stamp_events')
    .insert({
      business_id: businessId,
      customer_id: input.customerId,
      amount: input.amount,
      source: 'manual',
      issued_by: businessId,
    });

  if (eventError) logger.error({ eventError }, 'Failed to insert stamp event');

  // Issue a voucher for each crossed reward stage
  const voucherCodes: string[] = [];

  for (const stage of crossed) {
    const { data: voucher } = await supabase
      .from('vouchers')
      .insert({
        business_id: businessId,
        customer_id: input.customerId,
        type: 'reward',
        description: stage.description,
      })
      .select('code')
      .single();

    if (voucher?.code) voucherCodes.push(voucher.code);
  }

  const result: IssueStampsResult = {
    newTotal: finalTotal,
    lifetimeTotal: newLifetime,
    rewardIssued,
    voucherCodes,
    ...(voucherCodes[0] !== undefined ? { voucherCode: voucherCodes[0] } : {}),
  };

  // Fire-and-forget WhatsApp notification — never blocks or fails the stamp transaction
  if (input.notifyWhatsApp) {
    const notifyAsync = async (): Promise<void> => {
      try {
        const { wa_phone_number_id, wa_access_token_enc, message_templates } = business;
        if (!wa_phone_number_id || !wa_access_token_enc) return;
        const customTemplates = (message_templates as Record<string, string> | null) ?? {};

        const walletUrl = customer.wallet_token && business.slug
          ? `${env.CLIENT_URL}/r/${business.slug}/wallet/${customer.wallet_token}?new=1`
          : undefined;

        const imageUrl = !rewardIssued && customer.wallet_token && env.BACKEND_URL
          ? `${env.BACKEND_URL}/api/v1/public/stamp-image/${customer.wallet_token}`
          : undefined;

        // Use the first crossed stage description for the reward message
        const firstStage = crossed[0];
        const template = rewardIssued && firstStage
          ? rewardEarnedText(
              customer.phone_enc,
              voucherCodes.join(', '),
              firstStage.description,
              walletUrl,
              undefined,
              customTemplates['reward_earned_cta'] ?? undefined,
            )
          : stampIssuedText(
              customer.phone_enc,
              input.amount,
              finalTotal,
              stampCount,
              walletUrl,
              undefined,
              imageUrl,
              customTemplates['stamp_issued_cta'] ?? undefined,
            );

        const { to: _to, ...templateBody } = template;

        const waMessageId = await sendMessage(
          wa_phone_number_id,
          wa_access_token_enc,
          customer.phone_enc,
          templateBody,
        );

        const { error: logError } = await supabase.from('notification_logs').insert({
          business_id: businessId,
          customer_id: input.customerId,
          event_type: rewardIssued ? 'voucher_issued' : 'stamp_issued',
          status: 'sent',
          ...(waMessageId !== null ? { wa_message_id: waMessageId } : {}),
        });

        if (logError) logger.error({ logError }, 'Failed to insert notification log');
      } catch (err) {
        logger.error({ err }, 'WhatsApp notification failed');
      }
    };

    notifyAsync().catch((err) => logger.error({ err }, 'Unhandled error in WhatsApp notification'));
  }

  return result;
}
