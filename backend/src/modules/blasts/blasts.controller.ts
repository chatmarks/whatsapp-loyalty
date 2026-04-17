import type { Request, Response, NextFunction } from 'express';
import { CreateBlastSchema } from './blasts.schema.js';
import * as BlastService from './blasts.service.js';

export async function listHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await BlastService.listBlasts(req.business.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function createHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = CreateBlastSchema.parse(req.body);
    const data = await BlastService.createBlast(req.business.id, input);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function sendHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await BlastService.sendBlast(req.business.id, req.params['id'] as string);
    res.json({ data: { message: 'Blast initiated' } });
  } catch (err) {
    next(err);
  }
}

export async function deleteHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await BlastService.deleteBlast(req.business.id, req.params['id'] as string);
    res.json({ data: { message: 'Blast deleted' } });
  } catch (err) {
    next(err);
  }
}
