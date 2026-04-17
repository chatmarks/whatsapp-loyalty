import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Voucher, PaginatedResponse, ApiSuccess } from '@/types';

interface IssueVoucherInput {
  customerId: string;
  type: 'manual' | 'birthday' | 'winback';
  description: string;
  discountType?: 'percent' | 'fixed' | 'free_item';
  discountValue?: number;
  expiresAt?: string;
}

export function useVouchers(customerId?: string) {
  const qs = customerId ? `?customerId=${customerId}` : '';
  return useQuery({
    queryKey: ['vouchers', customerId],
    queryFn: () => api.get<PaginatedResponse<Voucher>>(`/vouchers${qs}`),
  });
}

export function useIssueVoucher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: IssueVoucherInput) =>
      api.post<ApiSuccess<Voucher>>('/vouchers/issue', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vouchers'] }),
  });
}

export function useRedeemVoucher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => api.post<ApiSuccess<Voucher>>(`/vouchers/${code}/redeem`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vouchers'] }),
  });
}
