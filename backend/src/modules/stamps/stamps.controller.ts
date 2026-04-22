import type { Request, Response, NextFunction } from 'express';
import { IssueStampsSchema } from './stamps.schema.js';
import { supabase } from '../../config/supabase.js';
import * as StampService from './stamps.service.js';

export async function issueHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = IssueStampsSchema.parse(req.body);
    const result = await StampService.issueStamps(req.business.id, input);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function listHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page     = Math.max(1, parseInt(String(req.query['page'] ?? '1')));
    const pageSize = 25;

    const { data, count } = await supabase
      .from('stamp_events')
      .select('id, amount, source, created_at, customer:customers(id, display_name, wa_contact_name)', { count: 'exact' })
      .eq('business_id', req.business.id)
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    res.json({ data: data ?? [], total: count ?? 0, page, pageSize });
  } catch (err) {
    next(err);
  }
}
