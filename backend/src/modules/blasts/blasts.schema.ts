import { z } from 'zod';

export const CreateBlastSchema = z.object({
  name: z.string().min(1).max(100),
  templateName: z.string().min(1),
  templateParams: z.record(z.string()).optional(),
  audience: z.enum(['all', 'inactive_30']).or(z.string().startsWith('tier:')).default('all'),
  scheduledAt: z.string().datetime().optional(),
});

export type CreateBlastInput = z.infer<typeof CreateBlastSchema>;
