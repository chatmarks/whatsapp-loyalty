import { supabase } from '../../config/supabase.js';
import { NotFoundError } from '../../lib/errors.js';
import { issueStamps } from '../stamps/stamps.service.js';
import type { Order } from '../../types/database.js';
import type { CreateOrderInput, UpdateOrderStatusInput, ListOrdersInput } from './orders.schema.js';
import type { PaginatedResponse } from '../../types/api.js';

function calcTotals(lineItems: CreateOrderInput['lineItems']): {
  subtotal: number;
  taxTotal: number;
} {
  let subtotal = 0;
  let taxTotal = 0;
  for (const item of lineItems) {
    const lineTotal = item.qty * item.unitPrice;
    subtotal += lineTotal;
    taxTotal += lineTotal * (item.taxRate / 100);
  }
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxTotal: Math.round(taxTotal * 100) / 100,
  };
}

export async function listOrders(
  businessId: string,
  input: ListOrdersInput,
): Promise<PaginatedResponse<Order>> {
  const offset = (input.page - 1) * input.pageSize;

  let query = supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .range(offset, offset + input.pageSize - 1);

  if (input.status !== 'all') query = query.eq('status', input.status);
  if (input.customerId) query = query.eq('customer_id', input.customerId);

  const { data, count, error } = await query;
  if (error) throw new Error('Failed to fetch orders');

  return {
    data: (data ?? []) as Order[],
    total: count ?? 0,
    page: input.page,
    pageSize: input.pageSize,
  };
}

export async function getOrder(businessId: string, orderId: string): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('business_id', businessId)
    .single();

  if (error || !data) throw new NotFoundError('Order');
  return data as Order;
}

export async function createOrder(businessId: string, input: CreateOrderInput): Promise<Order> {
  const { subtotal, taxTotal } = calcTotals(input.lineItems);

  // Apply voucher discount if provided
  let discountAmount = 0;
  if (input.voucherId) {
    const { data: voucher } = await supabase
      .from('vouchers')
      .select('discount_type, discount_value')
      .eq('id', input.voucherId)
      .eq('business_id', businessId)
      .is('redeemed_at', null)
      .single();

    if (voucher?.discount_type === 'percent' && voucher.discount_value) {
      discountAmount = Math.round(subtotal * (voucher.discount_value / 100) * 100) / 100;
    } else if (voucher?.discount_type === 'fixed' && voucher.discount_value) {
      discountAmount = Math.min(voucher.discount_value, subtotal);
    }
  }

  const total = Math.max(0, subtotal + taxTotal - discountAmount);

  const lineItemsDb = input.lineItems.map((item) => ({
    product_id: item.productId,
    name: item.name,
    qty: item.qty,
    unit_price: item.unitPrice,
    tax_rate: item.taxRate,
  }));

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      business_id: businessId,
      customer_id: input.customerId ?? null,
      status: 'pending',
      source: input.source,
      line_items: lineItemsDb,
      subtotal,
      tax_total: taxTotal,
      discount_amount: discountAmount,
      total,
      voucher_id: input.voucherId ?? null,
      payment_method: input.paymentMethod ?? null,
      remark: input.remark ?? null,
    })
    .select('*')
    .single();

  if (error || !order) throw new Error('Failed to create order');

  // Award stamps if customer attached (1 stamp per order by default)
  if (input.customerId) {
    await issueStamps(businessId, {
      customerId: input.customerId,
      amount: 1,
      notifyWhatsApp: input.notifyWhatsApp,
    }).catch(() => {
      // Stamp failure should not fail the order
    });

    await supabase
      .from('orders')
      .update({ stamps_awarded: 1 })
      .eq('id', order.id);
  }

  return order as Order;
}

export async function updateOrderStatus(
  businessId: string,
  orderId: string,
  input: UpdateOrderStatusInput,
): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .update({ status: input.status })
    .eq('id', orderId)
    .eq('business_id', businessId)
    .select('*')
    .single();

  if (error || !data) throw new NotFoundError('Order');
  return data as Order;
}
