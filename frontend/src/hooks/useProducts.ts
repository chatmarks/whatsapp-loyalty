import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Product, ApiSuccess } from '@/types';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => api.get<ApiSuccess<Product[]>>('/products').then((r) => r.data),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Product, 'id' | 'active'>) =>
      api.post<ApiSuccess<Product>>('/products', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Product> & { id: string }) =>
      api.patch<ApiSuccess<Product>>(`/products/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}
