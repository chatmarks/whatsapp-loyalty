import type { Request, Response, NextFunction } from 'express';
import { CreateOrderSchema, UpdateOrderStatusSchema, ListOrdersSchema } from './orders.schema.js';
import * as OrderService from './orders.service.js';

export async function listHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = ListOrdersSchema.parse(req.query);
    const result = await OrderService.listOrders(req.business.id, input);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await OrderService.getOrder(req.business.id, req.params['id'] as string);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function createHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = CreateOrderSchema.parse(req.body);
    const data = await OrderService.createOrder(req.business.id, input);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function updateStatusHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = UpdateOrderStatusSchema.parse(req.body);
    const data = await OrderService.updateOrderStatus(req.business.id, req.params['id'] as string, input);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}
