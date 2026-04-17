import { z } from 'zod';

export const IssueVoucherSchema = z.object({
  customerId: z.string().uuid(),
  type: z.enum(['manual', 'birthday', 'winback']),
  description: z.string().min(1).max(200),
  discountType: z.enum(['percent', 'fixed', 'free_item']).optional(),
  discountValue: z.number().positive().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const ListVouchersSchema = z.object({
  customerId: z.string().uuid().optional(),
  status: z.enum(['active', 'claimed', 'redeemed', 'all']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type IssueVoucherInput = z.infer<typeof IssueVoucherSchema>;
export type ListVouchersInput = z.infer<typeof ListVouchersSchema>;
