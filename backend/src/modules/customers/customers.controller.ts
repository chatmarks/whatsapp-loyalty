import type { Request, Response, NextFunction } from 'express';
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
