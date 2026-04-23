import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { apiRateLimit } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

// Module routers
import { authRouter } from './modules/auth/auth.router.js';
import { businessesRouter } from './modules/businesses/businesses.router.js';
import { customersRouter } from './modules/customers/customers.router.js';
import { stampsRouter } from './modules/stamps/stamps.router.js';
import { vouchersRouter } from './modules/vouchers/vouchers.router.js';
import { productsRouter } from './modules/products/products.router.js';
import { ordersRouter } from './modules/orders/orders.router.js';
import { membershipRouter } from './modules/membership/membership.router.js';
import { blastsRouter } from './modules/blasts/blasts.router.js';
import { whatsappRouter } from './modules/whatsapp/whatsapp.router.js';
import { paymentsRouter } from './modules/payments/payments.router.js';
import { reportsRouter } from './modules/reports/reports.router.js';
import { publicRouter } from './modules/public/public.router.js';
import { chatRouter } from './modules/chat/chat.router.js';
import { stampRequestsRouter } from './modules/stamp-requests/stamp-requests.router.js';

export function createApp(): express.Application {
  const app = express();

  // Trust the first proxy hop (Railway / Vercel / ngrok all set X-Forwarded-For)
  app.set('trust proxy', 1);

  // Security headers
  app.use(helmet());

  // CORS — whitelist only
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // Raw body needed for webhook signature verification — mount before json()
  app.use(
    '/api/v1/webhook/whatsapp',
    express.raw({ type: 'application/json' }),
  );

  // Stripe webhook also needs raw body
  app.use(
    '/api/v1/payments/webhook',
    express.raw({ type: 'application/json' }),
  );

  // JSON body parser for all other routes
  app.use(express.json({ limit: '100kb' }));

  // Health check — no auth, no rate limit
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', ts: new Date().toISOString() });
  });

  // API routes
  app.use('/api/v1', apiRateLimit);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/businesses', businessesRouter);
  app.use('/api/v1/customers', customersRouter);
  app.use('/api/v1/stamps', stampsRouter);
  app.use('/api/v1/vouchers', vouchersRouter);
  app.use('/api/v1/products', productsRouter);
  app.use('/api/v1/orders', ordersRouter);
  app.use('/api/v1/membership', membershipRouter);
  app.use('/api/v1/blasts', blastsRouter);
  app.use('/api/v1/webhook', whatsappRouter);
  app.use('/api/v1/payments', paymentsRouter);
  app.use('/api/v1/reports', reportsRouter);
  app.use('/api/v1/public', publicRouter);
  app.use('/api/v1/chat', chatRouter);
  app.use('/api/v1/stamp-requests', stampRequestsRouter);

  app.use(errorHandler);

  return app;
}
