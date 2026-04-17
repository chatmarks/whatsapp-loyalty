import type { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { env } from '../../config/env.js';
import { supabase } from '../../config/supabase.js';
import { logger } from '../../lib/logger.js';

const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' });

// Stripe price IDs — set in Stripe dashboard, reference via env if needed
const PLAN_PRICES: Record<string, string> = {
  starter: 'price_starter_monthly',
  pro: 'price_pro_monthly',
};

export async function getSubscriptionHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { data: biz } = await supabase
      .from('businesses')
      .select('plan, stripe_subscription_id')
      .eq('id', req.business.id)
      .single();

    res.json({ data: { plan: biz?.plan ?? 'free', subscriptionId: biz?.stripe_subscription_id } });
  } catch (err) {
    next(err);
  }
}

export async function createCheckoutHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const plan = req.body.plan as string;
    if (!PLAN_PRICES[plan]) {
      res.status(422).json({ error: 'Invalid plan' });
      return;
    }

    const { data: biz } = await supabase
      .from('businesses')
      .select('owner_email, stripe_customer_id')
      .eq('id', req.business.id)
      .single();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: biz?.stripe_customer_id ?? undefined,
      customer_email: biz?.stripe_customer_id ? undefined : biz?.owner_email,
      line_items: [{ price: PLAN_PRICES[plan], quantity: 1 }],
      success_url: `${env.CLIENT_URL}/payments?success=1`,
      cancel_url: `${env.CLIENT_URL}/payments`,
      metadata: { business_id: req.business.id, plan },
    });

    res.json({ data: { url: session.url } });
  } catch (err) {
    next(err);
  }
}

export async function createPortalHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { data: biz } = await supabase
      .from('businesses')
      .select('stripe_customer_id')
      .eq('id', req.business.id)
      .single();

    if (!biz?.stripe_customer_id) {
      res.status(422).json({ error: 'No Stripe customer' });
      return;
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: biz.stripe_customer_id,
      return_url: `${env.CLIENT_URL}/payments`,
    });

    res.json({ data: { url: session.url } });
  } catch (err) {
    next(err);
  }
}

export async function stripeWebhookHandler(req: Request, res: Response): Promise<void> {
  const sig = req.headers['stripe-signature'];
  if (!sig) {
    res.status(400).json({ error: 'Missing signature' });
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const { business_id, plan } = session.metadata ?? {};
      if (business_id && plan) {
        await supabase
          .from('businesses')
          .update({
            plan,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
          })
          .eq('id', business_id);
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      await supabase
        .from('businesses')
        .update({ plan: 'free', stripe_subscription_id: null })
        .eq('stripe_subscription_id', sub.id);
    }
  } catch (err) {
    logger.error({ err, eventType: event.type }, 'Stripe webhook handler error');
  }

  res.json({ received: true });
}
