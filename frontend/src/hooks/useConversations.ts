import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Conversation {
  customer_id: string;
  display_name: string | null;
  wa_contact_name: string | null;
  phone_display: string;
  opted_out_at: string | null;
  last_body: string;
  last_direction: 'inbound' | 'outbound';
  last_message_at: string;
  last_status: string;
  unread: boolean;
}

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get<{ data: Conversation[] }>('/chat/conversations'),
    refetchInterval: 15_000,
  });
}

export function useUnreadCount() {
  const { data } = useConversations();
  return (data?.data ?? []).filter((c) => c.unread).length;
}
