import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface PendingStampRequest {
  id: string;
  created_at: string;
  customer_id: string;
  display_name: string | null;
  wa_contact_name: string | null;
  phone_display: string;
  total_stamps: number;
  stamp_count: number;
  primary_color: string;
  reward_stages: Array<{ stamp: number; description: string; emoji?: string }>;
}

export function usePendingStampRequests() {
  return useQuery({
    queryKey: ['stamp-requests', 'pending'],
    queryFn: () => api.get<{ data: PendingStampRequest[] }>('/stamp-requests/pending'),
    refetchInterval: 4_000,
    select: (res) => res.data,
  });
}

export function useApproveStampRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/stamp-requests/${id}/approve`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stamp-requests'] });
      qc.invalidateQueries({ queryKey: ['stamps'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useDeclineStampRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/stamp-requests/${id}/decline`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stamp-requests'] }),
  });
}
