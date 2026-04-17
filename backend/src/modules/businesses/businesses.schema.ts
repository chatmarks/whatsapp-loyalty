import { z } from 'zod';

export const UpdateBusinessSchema = z.object({
  businessName: z.string().min(2).max(100).optional(),
  phoneDisplay: z.string().optional(),
  logoUrl: z.string().url().optional().nullable(),
  bannerUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  youtubeUrl: z.string().url().optional().nullable(),
  stampsPerReward: z.number().int().min(1).max(100).optional(),
  rewardDescription: z.string().min(1).max(200).optional(),
  stampCount: z.number().int().min(3).max(12).optional(),
  rewardStages: z
    .array(
      z.object({
        stamp: z.number().int().min(1).max(12),
        description: z.string().min(1).max(200),
      }),
    )
    .min(1)
    .max(12)
    .optional(),
  timezone: z.string().optional(),
});

export const UpdateWhatsAppSchema = z.object({
  waPhoneNumberId: z.string().min(1),
  waAccessToken: z.string().min(1),
});

export type UpdateBusinessInput = z.infer<typeof UpdateBusinessSchema>;
export type UpdateWhatsAppInput = z.infer<typeof UpdateWhatsAppSchema>;
