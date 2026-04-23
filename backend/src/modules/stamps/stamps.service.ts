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

  // Referral bonus — fires only when this is the referred customer's
  // very first stamp ever. Issues +1 referral stamp to both parties.
  if (customer.lifetime_stamps === 0 && input.amount > 0) {
    processReferralBonus(businessId, input.customerId, stampCount).catch((err) =>
      logger.error({ err }, 'Referral bonus processing failed'),
    );
  }

  return result;
}

/**
 * Issues a one-time +1 referral stamp to both the referred customer and
 * the customer who referred them. Sets referral_reward_at to prevent re-trigger.
 * Called fire-and-forget from issueStamps — never blocks the main flow.
 */
async function processReferralBonus(
  businessId: string,
  customerId: string,
  stampCount: number,
): Promise<void> {
  const { data: cust } = await supabase
    .from('customers')
    .select('referred_by_code, referral_reward_at, total_stamps, lifetime_stamps')
    .eq('id', customerId)
    .single();

  if (!cust?.referred_by_code || cust.referral_reward_at) return;

  // Atomically claim the slot — prevents double-issue under concurrent requests
  const { error: claimErr } = await supabase
    .from('customers')
    .update({ referral_reward_at: new Date().toISOString() })
    .eq('id', customerId)
    .is('referral_reward_at', null); // only if not already claimed

  if (claimErr) {
    logger.error({ claimErr }, 'Failed to claim referral slot');
    return;
  }

  // +1 bonus stamp to the referred customer
  const refNew = (cust.total_stamps as number) + 1;
  const refFinal = refNew >= stampCount ? refNew % stampCount : refNew;
  await supabase
    .from('customers')
    .update({ total_stamps: refFinal, lifetime_stamps: (cust.lifetime_stamps as number) + 1 })
    .eq('id', customerId);

  await supabase.from('stamp_events').insert({
    business_id: businessId,
    customer_id: customerId,
    amount: 1,
    source: 'referral',
    issued_by: businessId,
  });

  // Find the referrer by their customer_code
  const { data: referrer } = await supabase
    .from('customers')
    .select('id, total_stamps, lifetime_stamps')
    .eq('business_id', businessId)
    .eq('customer_code', cust.referred_by_code)
    .is('opted_out_at', null)
    .maybeSingle();

  if (!referrer) return;

  // +1 bonus stamp to the referrer
  const rrNew = (referrer.total_stamps as number) + 1;
  const rrFinal = rrNew >= stampCount ? rrNew % stampCount : rrNew;
  await supabase
    .from('customers')
    .update({
      total_stamps: rrFinal,
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
    'Referral bonus stamps issued to both parties',
  );
}
