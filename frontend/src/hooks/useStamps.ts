import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiSuccess, PaginatedResponse } from '@/types';

export interface StampEvent {
  id: string;
  amount: number;
  source: 'manual' | 'order' | 'referral' | 'keyword';
  created_at: string;
  customer: { id: string; display_name: string | null; wa_contact_name: string | null } | null;
}

export function useStampEvents(page = 1) {
  return useQuery({
    queryKey: ['stamps', page],
    queryFn: () => api.get<PaginatedResponse<StampEvent>>(`/stamps?page=${page}`),
  });
}

interface IssueStampsInput {
  customerId: string;
  amount: number;
  notifyWhatsApp?: boolean;
}

interface IssueStampsResult {
  newTotal: number;
  lifetimeTotal: number;
  rewardIssued: boolean;
  voucherCode?: string;
  voucherCodes: string[];
}

export function useIssueStamps() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: IssueStampsInput) =>
      api.post<ApiSuccess<IssueStampsResult>>('/stamps/issue', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stamps'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['business', 'stats'] });
    },
  });
}
