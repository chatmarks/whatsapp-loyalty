import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiSuccess, Business, BusinessStats } from '@/types';

export function useBusiness() {
  return useQuery({
    queryKey: ['business', 'me'],
    queryFn: () => api.get<ApiSuccess<Business>>('/businesses/me').then((r) => r.data),
  });
}

export function useBusinessStats() {
  return useQuery({
    queryKey: ['business', 'stats'],
    queryFn: () => api.get<ApiSuccess<BusinessStats>>('/businesses/me/stats').then((r) => r.data),
    refetchInterval: 60_000,
  });
}

export function useUpdateBusiness() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Business>) => api.patch<ApiSuccess<Business>>('/businesses/me', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['business'] }),
  });
}
