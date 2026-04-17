import type { Request, Response, NextFunction } from 'express';
import { supabase } from '../../config/supabase.js';
import { z } from 'zod';

const DateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export async function summaryHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { from, to } = DateRangeSchema.parse(req.query);
    const businessId = req.business.id;

    const [ordersRes, stampsRes, vouchersRes] = await Promise.all([
      supabase
        .from('orders')
        .select('total, status, created_at')
        .eq('business_id', businessId)
        .eq('status', 'paid')
        .gte('created_at', from ?? '2000-01-01')
        .lte('created_at', to ?? new Date().toISOString()),
      supabase
        .from('stamp_events')
        .select('amount, created_at')
        .eq('business_id', businessId)
        .gte('created_at', from ?? '2000-01-01'),
      supabase
        .from('vouchers')
        .select('redeemed_at')
        .eq('business_id', businessId)
        .not('redeemed_at', 'is', null),
    ]);

    const orders = ordersRes.data ?? [];
    const revenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const stamps = (stampsRes.data ?? []).reduce((sum, s) => sum + s.amount, 0);
    const redemptions = vouchersRes.data?.length ?? 0;

    res.json({
      data: {
        revenue: Math.round(revenue * 100) / 100,
        orderCount: orders.length,
        stamps,
        redemptions,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function customersHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const businessId = req.business.id;

    const { data: customers } = await supabase
      .from('customers')
      .select('opted_in_at, opted_out_at, created_at')
      .eq('business_id', businessId)
      .order('created_at', { ascending: true });

    const rows = customers ?? [];
    const total = rows.length;
    const active = rows.filter((c) => !c.opted_out_at).length;
    const churned = rows.filter((c) => c.opted_out_at).length;

    res.json({ data: { total, active, churned } });
  } catch (err) {
    next(err);
  }
}

export async function productsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const businessId = req.business.id;

    const { data: orders } = await supabase
      .from('orders')
      .select('line_items')
      .eq('business_id', businessId)
      .eq('status', 'paid');

    // Aggregate product revenue from line_items JSONB
    const productMap = new Map<string, { name: string; qty: number; revenue: number }>();

    for (const order of orders ?? []) {
      const items = order.line_items as Array<{
        name: string;
        qty: number;
        unit_price: number;
        product_id: string;
      }>;
      for (const item of items) {
        const existing = productMap.get(item.product_id) ?? { name: item.name, qty: 0, revenue: 0 };
        productMap.set(item.product_id, {
          name: item.name,
          qty: existing.qty + item.qty,
          revenue: Math.round((existing.revenue + item.qty * item.unit_price) * 100) / 100,
        });
      }
    }

    const topProducts = [...productMap.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    res.json({ data: topProducts });
  } catch (err) {
    next(err);
  }
}
