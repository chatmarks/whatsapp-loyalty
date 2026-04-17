import { Router } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import { getMeHandler, updateMeHandler, updateWhatsAppHandler, getStatsHandler } from './businesses.controller.js';

export const businessesRouter = Router();

businessesRouter.use(authMiddleware);

businessesRouter.get('/me', getMeHandler);
businessesRouter.patch('/me', updateMeHandler);
businessesRouter.patch('/me/whatsapp', updateWhatsAppHandler);
businessesRouter.get('/me/stats', getStatsHandler);
