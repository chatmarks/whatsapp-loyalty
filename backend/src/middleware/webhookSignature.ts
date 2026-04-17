import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

/**
 * Verifies the X-Hub-Signature-256 header on Meta webhook POST requests.
 * Must be used AFTER express.raw() so req.body is a Buffer.
 */
export function webhookSignature(req: Request, res: Response, next: NextFunction): void {
  const signature = req.headers['x-hub-signature-256'];
  if (typeof signature !== 'string') {
    logger.warn('Webhook received without X-Hub-Signature-256');
    res.status(401).json({ error: 'Missing signature' });
    return;
  }

  const rawBody = req.body as Buffer;
  const expected = 'sha256=' + createHmac('sha256', env.META_APP_SECRET)
    .update(rawBody)
    .digest('hex');

  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    // Pad to equal length before timing-safe compare
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      logger.warn('Webhook signature mismatch');
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }
  } catch {
    res.status(401).json({ error: 'Signature verification failed' });
    return;
  }

  // Re-parse the raw body for downstream handlers
  req.body = JSON.parse(rawBody.toString('utf8'));
  next();
}
