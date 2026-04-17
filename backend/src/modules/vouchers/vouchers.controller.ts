import type { Request, Response, NextFunction } from 'express';
import { IssueVoucherSchema, ListVouchersSchema } from './vouchers.schema.js';
import * as VoucherService from './vouchers.service.js';

export async function listHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = ListVouchersSchema.parse(req.query);
    const result = await VoucherService.listVouchers(req.business.id, input);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function issueHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = IssueVoucherSchema.parse(req.body);
    const data = await VoucherService.issueVoucher(req.business.id, input);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function redeemHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await VoucherService.redeemVoucher(req.business.id, req.params['code'] as string);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function claimHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await VoucherService.claimVoucher(req.business.id, req.params['code'] as string);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}
