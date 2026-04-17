import type { Request, Response, NextFunction } from 'express';
import { CreateTierSchema, UpdateTierSchema } from './membership.schema.js';
import * as MembershipService from './membership.service.js';

export async function listHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await MembershipService.listTiers(req.business.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function createHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = CreateTierSchema.parse(req.body);
    const data = await MembershipService.createTier(req.business.id, input);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function updateHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = UpdateTierSchema.parse(req.body);
    const data = await MembershipService.updateTier(req.business.id, req.params['id'] as string, input);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function deleteHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await MembershipService.deleteTier(req.business.id, req.params['id'] as string);
    res.json({ data: { message: 'Tier deleted' } });
  } catch (err) {
    next(err);
  }
}
