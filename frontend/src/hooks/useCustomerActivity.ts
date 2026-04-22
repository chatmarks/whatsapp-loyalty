import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface ActivityEvent {
  id: string;
  event_type: string;
  created_at: string;
}

export function useCustomerActivity(customerId: string) {
  return useQuery({
    queryKey: ['customer-activity', customerId],
    queryFn: () =>
      api.get<{ data: ActivityEvent[] }>(`/customers/${customerId}/activity`),
    enabled: !!customerId,
    refetchInterval: 15_000,
    select: (res) => res.data,
  });
}
