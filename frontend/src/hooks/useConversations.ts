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

const STORAGE_KEY = 'chat_seen';

function getSeenMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

/** Call when a chat is opened — marks the conversation as read. */
export function markConversationSeen(customerId: string): void {
  const map = getSeenMap();
  map[customerId] = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get<{ data: Conversation[] }>('/chat/conversations'),
    refetchInterval: 15_000,
  });
}

/** Returns true if there is at least one conversation with a newer inbound message than last seen. */
export function useHasUnread(): boolean {
  const { data } = useConversations();
  if (!data?.data.length) return false;
  const seen = getSeenMap();
  return data.data.some((c) => {
    if (!c.unread) return false;
    const lastSeen = seen[c.customer_id];
    if (!lastSeen) return true;
    return new Date(c.last_message_at) > new Date(lastSeen);
  });
}
