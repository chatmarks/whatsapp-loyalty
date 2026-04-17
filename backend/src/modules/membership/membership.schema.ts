import { z } from 'zod';

const PerkSchema = z.object({
  label: z.string().min(1).max(100),
  description: z.string().max(300).optional().default(''),
});

export const CreateTierSchema = z.object({
  name: z.string().min(1).max(50),
  minLifetimeStamps: z.number().int().min(0),
  stampMultiplier: z.number().min(1).max(5).default(1),
  perks: z.array(PerkSchema).default([]),
  badgeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  sortOrder: z.number().int().default(0),
});

export const UpdateTierSchema = CreateTierSchema.partial();

export type CreateTierInput = z.infer<typeof CreateTierSchema>;
export type UpdateTierInput = z.infer<typeof UpdateTierSchema>;
