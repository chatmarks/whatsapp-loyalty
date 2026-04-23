import type { Request, Response, NextFunction } from 'express';
import { supabase } from '../../config/supabase.js';
import { NotFoundError } from '../../lib/errors.js';
import { createOrder } from '../orders/orders.service.js';
import { CreateOrderSchema } from '../orders/orders.schema.js';
import { logger } from '../../lib/logger.js';

async function findBusinessBySlug(slug: string) {
  const { data } = await supabase
    .from('businesses')
    .select('id, business_name, logo_url, primary_color, wa_phone_number_id, wa_phone_number, stamps_per_reward, reward_description, stamp_count, reward_stages')
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle();
  return data;
}

export async function getRegistrationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const business = await findBusinessBySlug(req.params['slug'] as string);
    if (!business) throw new NotFoundError('Business');

    // Return only public-safe branding info — no secrets
    // waPhoneNumber is the actual number for wa.me links (NOT the Meta phone_number_id)
    res.json({
      data: {
        businessName: business.business_name,
        logoUrl: business.logo_url,
        primaryColor: business.primary_color,
        stampsPerReward: business.stamps_per_reward,
        rewardDescription: business.reward_description,
        stampCount: business.stamp_count ?? business.stamps_per_reward,
        rewardStages: business.reward_stages ?? [{ stamp: business.stamps_per_reward, description: business.reward_description }],
        // Actual WA number for deep links — may be null if not configured yet
        waPhoneNumber: (business.wa_phone_number as string | null) ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getWalletHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const business = await findBusinessBySlug(req.params['slug'] as string);
    if (!business) throw new NotFoundError('Business');

    const { data: customer } = await supabase
      .from('customers')
      .select('id, display_name, total_stamps, lifetime_stamps, customer_code')
      .eq('business_id', business.id)
      .eq('wallet_token', req.params['token'])
      .is('opted_out_at', null)
      .maybeSingle();

    if (!customer) throw new NotFoundError('Wallet');

    const [{ data: vouchers }, { data: recentStamps }] = await Promise.all([
      supabase
        .from('vouchers')
        .select('code, description, issued_at, expires_at')
        .eq('customer_id', customer.id)
        .is('redeemed_at', null)
        .is('claimed_at', null)
        .order('issued_at', { ascending: false }),
      // Fetch sources for the stamps currently on the card (newest first, then reverse)
      customer.total_stamps > 0
        ? supabase
            .from('stamp_events')
            .select('source')
            .eq('business_id', business.id)
            .eq('customer_id', customer.id)
            .order('created_at', { ascending: false })
            .limit(customer.total_stamps as number)
        : { data: [] },
    ]);

    // Reverse so index 0 = first dot (oldest stamp on current card)
    const stampSources = ((recentStamps ?? []) as { source: string }[])
      .map((r) => r.source)
      .reverse();

    res.json({
      data: {
        business: {
          name: business.business_name,
          logoUrl: business.logo_url,
          primaryColor: business.primary_color,
          stampsPerReward: business.stamps_per_reward,
          rewardDescription: business.reward_description,
          stampCount: business.stamp_count ?? business.stamps_per_reward,
          rewardStages: business.reward_stages ?? [{ stamp: business.stamps_per_reward, description: business.reward_description }],
        },
        customer: {
          displayName: customer.display_name,
          totalStamps: customer.total_stamps,
          lifetimeStamps: customer.lifetime_stamps,
          // customer_code doubles as the shareable referral code
          referralCode: customer.customer_code ?? null,
          // Source per filled dot on the current card ('stamp' | 'referral' | ...)
          stampSources,
        },
        vouchers: vouchers ?? [],
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Redeem a voucher directly from the wallet.
 * Auth: wallet_token scopes access to exactly one customer's vouchers.
 */
export async function redeemWalletVoucherHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { slug, token, code } = req.params as { slug: string; token: string; code: string };

    const business = await findBusinessBySlug(slug);
    if (!business) throw new NotFoundError('Business');

    // Resolve customer from wallet token
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('business_id', business.id)
      .eq('wallet_token', token)
      .is('opted_out_at', null)
      .maybeSingle();

    if (!customer) throw new NotFoundError('Wallet');

    // Find the voucher — must belong to this customer and not yet redeemed
    const { data: voucher } = await supabase
      .from('vouchers')
      .select('id, redeemed_at')
      .eq('business_id', business.id)
      .eq('customer_id', customer.id)
      .eq('code', code.toUpperCase())
      .maybeSingle();

    if (!voucher) throw new NotFoundError('Voucher');
    if (voucher.redeemed_at) {
      res.status(409).json({ error: 'Voucher already redeemed' });
      return;
    }

    await supabase
      .from('vouchers')
      .update({ redeemed_at: new Date().toISOString() })
      .eq('id', voucher.id);

    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
}

export async function getPublicProductsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const business = await findBusinessBySlug(req.params['slug'] as string);
    if (!business) throw new NotFoundError('Business');

    const { data } = await supabase
      .from('products')
      .select('id, name, description, price, category, image_url, tax_rate')
      .eq('business_id', business.id)
      .eq('active', true)
      .order('category')
      .order('sort_order');

    res.json({ data: data ?? [] });
  } catch (err) {
    next(err);
  }
}

export async function submitPublicOrderHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const business = await findBusinessBySlug(req.params['slug'] as string);
    if (!business) throw new NotFoundError('Business');

    const input = CreateOrderSchema.parse({ ...req.body, source: 'client_form' });
    const order = await createOrder(business.id, input);
    res.status(201).json({ data: { orderId: order.id, total: order.total } });
  } catch (err) {
    next(err);
  }
}
