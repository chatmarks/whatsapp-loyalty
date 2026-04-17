import { supabase } from '../../config/supabase.js';
import { NotFoundError } from '../../lib/errors.js';
import type { Product } from '../../types/database.js';
import type { CreateProductInput, UpdateProductInput, SortProductsInput } from './products.schema.js';

export async function listProducts(businessId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('business_id', businessId)
    .eq('active', true)
    .order('category')
    .order('sort_order');

  if (error) throw new Error('Failed to fetch products');
  return (data ?? []) as Product[];
}

export async function createProduct(businessId: string, input: CreateProductInput): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert({
      business_id: businessId,
      name: input.name,
      description: input.description ?? null,
      price: input.price,
      category: input.category,
      image_url: input.imageUrl ?? null,
      tax_rate: input.taxRate,
      sort_order: input.sortOrder,
    })
    .select('*')
    .single();

  if (error || !data) throw new Error('Failed to create product');
  return data as Product;
}

export async function updateProduct(
  businessId: string,
  productId: string,
  input: UpdateProductInput,
): Promise<Product> {
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;
  if (input.price !== undefined) updates.price = input.price;
  if (input.category !== undefined) updates.category = input.category;
  if (input.imageUrl !== undefined) updates.image_url = input.imageUrl;
  if (input.taxRate !== undefined) updates.tax_rate = input.taxRate;
  if (input.sortOrder !== undefined) updates.sort_order = input.sortOrder;

  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', productId)
    .eq('business_id', businessId)
    .select('*')
    .single();

  if (error || !data) throw new NotFoundError('Product');
  return data as Product;
}

export async function deleteProduct(businessId: string, productId: string): Promise<void> {
  // Soft-delete: preserve historical order references
  const { error } = await supabase
    .from('products')
    .update({ active: false })
    .eq('id', productId)
    .eq('business_id', businessId);

  if (error) throw new NotFoundError('Product');
}

export async function sortProducts(businessId: string, input: SortProductsInput): Promise<void> {
  const updates = input.items.map(({ id, sortOrder }) =>
    supabase
      .from('products')
      .update({ sort_order: sortOrder })
      .eq('id', id)
      .eq('business_id', businessId),
  );
  await Promise.all(updates);
}
