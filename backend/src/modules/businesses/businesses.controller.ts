import type { Request, Response, NextFunction } from 'express';
import { UpdateBusinessSchema, UpdateWhatsAppSchema } from './businesses.schema.js';
import * as BusinessService from './businesses.service.js';

export async function getMeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await BusinessService.getMyBusiness(req.business.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function updateMeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = UpdateBusinessSchema.parse(req.body);
    const data = await BusinessService.updateBusiness(req.business.id, input);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function updateWhatsAppHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = UpdateWhatsAppSchema.parse(req.body);
    await BusinessService.updateWhatsApp(req.business.id, input);
    res.json({ data: { message: 'WhatsApp config updated' } });
  } catch (err) {
    next(err);
  }
}

export async function getStatsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await BusinessService.getStats(req.business.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}
