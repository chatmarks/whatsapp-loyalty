import { z } from 'zod';

export const IssueStampsSchema = z.object({
  customerId: z.string().uuid(),
  amount: z.number().int().min(1).max(50),
  notifyWhatsApp: z.boolean().default(false),
});

export type IssueStampsInput = z.infer<typeof IssueStampsSchema>;
