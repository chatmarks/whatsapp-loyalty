import { Router } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import {
  getSubscriptionHandler,
  createCheckoutHandler,
  createPortalHandler,
  stripeWebhookHandler,
} from './payments.controller.js';

export const paymentsRouter = Router();

// Stripe webhook — raw body already applied in app.ts, no JWT
paymentsRouter.post('/webhook', stripeWebhookHandler);

// Protected payment routes
paymentsRouter.use(authMiddleware);
paymentsRouter.get('/subscription', getSubscriptionHandler);
paymentsRouter.post('/checkout', createCheckoutHandler);
paymentsRouter.post('/portal', createPortalHandler);
