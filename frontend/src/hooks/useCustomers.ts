import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Customer, PaginatedResponse } from '@/types';

interface ListParams {
  search?: string;
  page?: number;
  pageSize?: number;
  optedOut?: 'true' | 'false';
}

export function useCustomers(params: ListParams = {}) {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  if (params.optedOut) qs.set('optedOut', params.optedOut);

  return useQuery({
    queryKey: ['customers', params],
    queryFn: () =>
      api.get<PaginatedResponse<Customer>>(`/customers?${qs}`),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: () => api.get<{ data: Customer }>(`/customers/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/customers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}
