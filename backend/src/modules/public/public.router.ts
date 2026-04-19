import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { publicRateLimit } from '../../middleware/rateLimiter.js';
import {
  getRegistrationHandler,
  submitRegistrationHandler,
  getWalletHandler,
  getPublicProductsHandler,
  submitPublicOrderHandler,
} from './public.controller.js';
import { supabase } from '../../config/supabase.js';
import { generateStampCardPng } from './stamp-card-image.js';

export const publicRouter = Router();

publicRouter.use(publicRateLimit);

publicRouter.get('/:slug/register', getRegistrationHandler);
publicRouter.get('/:slug/wallet/:token', getWalletHandler);
publicRouter.post('/:slug/register', submitRegistrationHandler);
publicRouter.get('/:slug/products', getPublicProductsHandler);
publicRouter.post('/:slug/orders', submitPublicOrderHandler);

// Dynamic stamp-card PNG — used as the image in WhatsApp stamp notifications.
// URL: /api/v1/public/stamp-image/:walletToken
// No auth — walletToken is an unguessable UUID that scopes access to one customer.
publicRouter.get('/stamp-image/:walletToken', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { walletToken } = req.params as { walletToken: string };

    const { data: customer } = await supabase
      .from('customers')
      .select('id, total_stamps, business_id')
      .eq('wallet_token', walletToken)
      .maybeSingle();

    if (!customer) { res.status(404).json({ error: 'Not found' }); return; }

    const { data: biz } = await supabase
      .from('businesses')
      .select('business_name, stamp_count, primary_color, reward_stages')
      .eq('id', customer.business_id)
      .single();

    if (!biz) { res.status(404).json({ error: 'Not found' }); return; }

    const png = generateStampCardPng(
      biz.business_name,
      (biz.primary_color as string | null) ?? '#25D366',
      (biz.stamp_count as number | null) ?? 8,
      (customer.total_stamps as number | null) ?? 0,
      (biz.reward_stages as Array<{ stamp: number; description: string; emoji?: string }> | null) ?? [],
    );

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.send(png);
  } catch (err) {
    next(err);
  }
});
