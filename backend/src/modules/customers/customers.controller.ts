import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ListCustomersSchema } from './customers.schema.js';
import * as CustomerService from './customers.service.js';

export async function listHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = ListCustomersSchema.parse(req.query);
    const result = await CustomerService.listCustomers(req.business.id, input);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await CustomerService.getCustomer(req.business.id, req.params['id'] as string);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function deleteHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await CustomerService.deleteCustomer(req.business.id, req.params['id'] as string);
    res.json({ data: { message: 'Customer anonymised per DSGVO' } });
  } catch (err) {
    next(err);
  }
}

export async function listMessagesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const customerId = req.params['id'] as string;
    const page = Math.max(1, parseInt(String(req.query['page'] ?? '1')));
    const result = await CustomerService.listMessages(req.business.id, customerId, page);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listActivityHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const customerId = req.params['id'] as string;
    const result = await CustomerService.listActivity(req.business.id, customerId);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

const SendMessageSchema = z.object({ body: z.string().min(1).max(4096) });

export async function sendMessageHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const customerId = req.params['id'] as string;
    const { body } = SendMessageSchema.parse(req.body);
    await CustomerService.sendMessageToCustomer(req.business, customerId, body);
    res.json({ data: { sent: true } });
  } catch (err) {
    next(err);
  }
}
