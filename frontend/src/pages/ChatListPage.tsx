import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConversations } from '@/hooks/useConversations';

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  return isToday
    ? d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

export function ChatListPage() {
  const { data, isLoading } = useConversations();
  const conversations = data?.data ?? [];

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-6 py-4">
        <h1 className="text-xl font-semibold">Chats</h1>
        <p className="text-sm text-muted-foreground">Alle Konversationen mit Kunden</p>
      </div>

      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Wird geladen…</p>
        </div>
      )}

      {!isLoading && conversations.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
          <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Noch keine Nachrichten. Sende die erste Nachricht auf einer Kundendetailseite.
          </p>
        </div>
      )}

      <ul className="flex-1 overflow-y-auto divide-y">
        {conversations.map((conv) => {
          const name = conv.display_name ?? conv.wa_contact_name ?? conv.phone_display;
          return (
            <li key={conv.customer_id}>
              <Link
                to={`/customers/${conv.customer_id}/chat`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-muted/40 transition-colors"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  {conv.unread && (
                    <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={cn('text-sm truncate', conv.unread ? 'font-semibold' : 'font-medium')}>
                      {name}
                    </span>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {formatTime(conv.last_message_at)}
                    </span>
                  </div>
                  <p className={cn('text-xs truncate mt-0.5', conv.unread ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                    {conv.last_direction === 'outbound' && <span className="text-muted-foreground">Du: </span>}
                    {conv.last_body}
                  </p>
                </div>

                {conv.unread && (
                  <span className="shrink-0 h-2.5 w-2.5 rounded-full bg-primary" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
