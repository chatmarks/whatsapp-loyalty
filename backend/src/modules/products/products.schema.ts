import { z } from 'zod';

export const CreateProductSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  price: z.number().min(0),
  category: z.string().min(1).max(50).default('Sonstiges'),
  imageUrl: z.string().url().optional(),
  taxRate: z.number().min(0).max(100).default(19),
  sortOrder: z.number().int().default(0),
});

export const UpdateProductSchema = CreateProductSchema.partial();

export const SortProductsSchema = z.object({
  items: z.array(z.object({ id: z.string().uuid(), sortOrder: z.number().int() })),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type SortProductsInput = z.infer<typeof SortProductsSchema>;
