import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PaginatedResponse } from '@/types';

export interface WaMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  status: string;
  created_at: string;
}

export function useMessages(customerId: string, page = 1) {
  return useQuery({
    queryKey: ['messages', customerId, page],
    queryFn: () =>
      api.get<PaginatedResponse<WaMessage>>(`/customers/${customerId}/messages?page=${page}`),
    enabled: !!customerId,
    refetchInterval: 10_000,
  });
}

export function useSendMessage(customerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      api.post(`/customers/${customerId}/messages`, { body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages', customerId] }),
  });
}
