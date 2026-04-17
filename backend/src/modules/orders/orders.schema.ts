import { z } from 'zod';

const LineItemSchema = z.object({
  productId: z.string().uuid(),
  name: z.string().min(1),
  qty: z.number().int().min(1),
  unitPrice: z.number().min(0),
  taxRate: z.number().min(0).max(100),
});

export const CreateOrderSchema = z.object({
  customerId: z.string().uuid().optional(),
  lineItems: z.array(LineItemSchema).min(1),
  voucherId: z.string().uuid().optional(),
  paymentMethod: z.enum(['cash', 'card', 'stripe']).optional(),
  remark: z.string().max(500).optional(),
  notifyWhatsApp: z.boolean().default(false),
  source: z.enum(['admin', 'client_form']).default('admin'),
});

export const UpdateOrderStatusSchema = z.object({
  status: z.enum(['paid', 'cancelled']),
});

export const ListOrdersSchema = z.object({
  status: z.enum(['pending', 'paid', 'cancelled', 'all']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  customerId: z.string().uuid().optional(),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>;
export type ListOrdersInput = z.infer<typeof ListOrdersSchema>;
