import { Router } from 'express';
import { publicRateLimit } from '../../middleware/rateLimiter.js';
import {
  getRegistrationHandler,
  submitRegistrationHandler,
  getWalletHandler,
  getPublicProductsHandler,
  submitPublicOrderHandler,
} from './public.controller.js';

export const publicRouter = Router();

publicRouter.use(publicRateLimit);

publicRouter.get('/:slug/register', getRegistrationHandler);
publicRouter.get('/:slug/wallet/:token', getWalletHandler);
publicRouter.post('/:slug/register', submitRegistrationHandler);
publicRouter.get('/:slug/products', getPublicProductsHandler);
publicRouter.post('/:slug/orders', submitPublicOrderHandler);
