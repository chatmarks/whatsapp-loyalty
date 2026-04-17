import { Router } from 'express';
import { webhookSignature } from '../../middleware/webhookSignature.js';
import { verifyHandler, webhookHandler } from './whatsapp.controller.js';

export const whatsappRouter = Router();

// GET — no signature needed for hub challenge
whatsappRouter.get('/whatsapp', verifyHandler);

// POST — raw body middleware applied in app.ts before this router;
// webhookSignature verifies HMAC and re-parses body
whatsappRouter.post('/whatsapp', webhookSignature, webhookHandler);
