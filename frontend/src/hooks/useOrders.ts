import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Order, PaginatedResponse, ApiSuccess } from '@/types';

interface CreateOrderInput {
  customerId?: string;
  lineItems: Array<{
    productId: string;
    name: string;
    qty: number;
    unitPrice: number;
    taxRate: number;
  }>;
  voucherId?: string;
  paymentMethod?: 'cash' | 'card' | 'stripe';
  remark?: string;
  notifyWhatsApp?: boolean;
}

interface ListOrdersParams {
  status?: 'pending' | 'paid' | 'cancelled' | 'all';
  page?: number;
  customerId?: string;
}

export function useOrders(params: ListOrdersParams = {}) {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.page) qs.set('page', String(params.page));
  if (params.customerId) qs.set('customerId', params.customerId);

  return useQuery({
    queryKey: ['orders', params],
    queryFn: () => api.get<PaginatedResponse<Order>>(`/orders?${qs}`),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: () => api.get<ApiSuccess<Order>>(`/orders/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrderInput) =>
      api.post<ApiSuccess<Order>>('/orders', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['business', 'stats'] });
    },
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'paid' | 'cancelled' }) =>
      api.patch<ApiSuccess<Order>>(`/orders/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}
