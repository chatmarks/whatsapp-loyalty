import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../../config/supabase.js';
import { encryptPhone, hashPhone } from '../../lib/crypto.js';
import { NotFoundError, ConflictError } from '../../lib/errors.js';
import { createOrder } from '../orders/orders.service.js';
import { CreateOrderSchema } from '../orders/orders.schema.js';
import { logger } from '../../lib/logger.js';

const OptInSchema = z.object({
  displayName: z.string().min(1).max(100),
  // E.164 format: +49... — validated but never logged
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/),
  consentGiven: z.literal(true, {
    errorMap: () => ({ message: 'DSGVO consent required' }),
  }),
});

async function findBusinessBySlug(slug: string) {
  const { data } = await supabase
    .from('businesses')
    .select('id, business_name, logo_url, primary_color, wa_phone_number_id, stamps_per_reward, reward_description, stamp_count, reward_stages')
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
    res.json({
      data: {
        businessName: business.business_name,
        logoUrl: business.logo_url,
        primaryColor: business.primary_color,
        stampsPerReward: business.stamps_per_reward,
        rewardDescription: business.reward_description,
        stampCount: business.stamp_count ?? business.stamps_per_reward,
        rewardStages: business.reward_stages ?? [{ stamp: business.stamps_per_reward, description: business.reward_description }],
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function submitRegistrationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = OptInSchema.parse(req.body);
    const business = await findBusinessBySlug(req.params['slug'] as string);
    if (!business) throw new NotFoundError('Business');

    const phoneHash = hashPhone(input.phone);

    // Check if already opted in
    const { data: existing } = await supabase
      .from('customers')
      .select('id, opted_out_at')
      .eq('business_id', business.id)
      .eq('phone_hash', phoneHash)
      .maybeSingle();

    if (existing && !existing.opted_out_at) {
      throw new ConflictError('Already registered for this loyalty program');
    }

    const phoneEnc = encryptPhone(input.phone);
    const optInIp = req.ip ?? null;

    if (existing?.opted_out_at) {
      // Re-opt-in: clear opt-out flag, update name
      await supabase
        .from('customers')
        .update({
          phone_enc: phoneEnc,
          display_name: input.displayName,
          opted_out_at: null,
          opted_in_at: new Date().toISOString(),
          opt_in_ip: optInIp,
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('customers').insert({
        business_id: business.id,
        phone_enc: phoneEnc,
        phone_hash: phoneHash,
        display_name: input.displayName,
        opted_in_at: new Date().toISOString(),
        opt_in_ip: optInIp,
      });
    }

    // Phone discarded after insert — never appears in response or logs
    logger.info({ businessId: business.id }, 'Customer opted in');

    res.status(201).json({
      data: {
        message: 'Registration successful',
        // WhatsApp deep-link for the customer to initiate conversation
        whatsappLink: business.wa_phone_number_id
          ? `https://wa.me/${business.wa_phone_number_id}?text=Hallo`
          : null,
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
      .select('id, display_name, total_stamps, lifetime_stamps')
      .eq('business_id', business.id)
      .eq('wallet_token', req.params['token'])
      .is('opted_out_at', null)
      .maybeSingle();

    if (!customer) throw new NotFoundError('Wallet');

    const { data: vouchers } = await supabase
      .from('vouchers')
      .select('code, description, issued_at, expires_at')
      .eq('customer_id', customer.id)
      .is('redeemed_at', null)
      .is('claimed_at', null)
      .order('issued_at', { ascending: false });

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
        },
        vouchers: vouchers ?? [],
      },
    });
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
