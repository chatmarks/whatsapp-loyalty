import type { Request, Response } from 'express';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { handleWebhookPayload } from './whatsapp.webhook.js';
import type { WebhookPayload } from '../../types/whatsapp.js';

// GET /webhook/whatsapp — Meta hub challenge verification
export function verifyHandler(req: Request, res: Response): void {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === env.META_VERIFY_TOKEN) {
    res.status(200).send(challenge);
    return;
  }
  res.status(403).json({ error: 'Verification failed' });
}

// POST /webhook/whatsapp — inbound messages + status updates
export function webhookHandler(req: Request, res: Response): void {
  // Ack immediately — Meta retries if it doesn't receive 200 within ~20s.
  // After res.send() headers are already sent, so we must NOT call next(err).
  res.status(200).json({ received: true });

  // Fire-and-forget; errors are logged but cannot be sent as HTTP responses.
  handleWebhookPayload(req.body as WebhookPayload).catch((err: unknown) => {
    logger.error({ err }, 'Unhandled error in webhook payload processing');
  });
}
