import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, MessageSquare } from 'lucide-react';
import { useConversations, markConversationSeen, getSeenMap } from '@/hooks/useConversations';
import { cn } from '@/lib/utils';

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return 'Gerade eben';
  if (mins  < 60) return `vor ${mins} Min.`;
  if (hours < 24) return `vor ${hours} Std.`;
  if (days  < 7)  return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ChatSlideout({ open, onClose }: Props) {
  const navigate   = useNavigate();
  const { data }   = useConversations();
  const panelRef   = useRef<HTMLDivElement>(null);
  const seenMap    = getSeenMap();

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  function openChat(customerId: string) {
    markConversationSeen(customerId);
    navigate(`/customers/${customerId}/chat`);
    onClose();
  }

  function isUnread(conv: { customer_id: string; last_message_at: string; unread: boolean }): boolean {
    if (!conv.unread) return false;
    const seen = seenMap[conv.customer_id];
    if (!seen) return true;
    return new Date(conv.last_message_at) > new Date(seen);
  }

  const conversations = data?.data ?? [];

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
          onClick={onClose}
        />
      )}

      {/* Slide-out panel */}
      <div
        ref={panelRef}
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-80 flex-col bg-card shadow-2xl border-l transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Nachrichten</h2>
            {conversations.some(isUnread) && (
              <span className="h-2 w-2 rounded-full bg-primary" />
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center px-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Noch keine Chats</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const unread = isUnread(conv);
              return (
                <button
                  key={conv.customer_id}
                  onClick={() => openChat(conv.customer_id)}
                  className={cn(
                    'flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-accent/50',
                    unread && 'bg-primary/5',
                  )}
                >
                  {/* Avatar */}
                  <div className={cn(
                    'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                    'bg-primary/10 text-primary',
                  )}>
                    {(conv.display_name ?? conv.phone_display ?? '?').charAt(0).toUpperCase()}
                    {unread && (
                      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className={cn('truncate text-sm', unread ? 'font-semibold' : 'font-medium')}>
                        {conv.display_name ?? conv.phone_display ?? 'Unbekannt'}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {formatRelativeTime(conv.last_message_at)}
                      </span>
                    </div>
                    <p className={cn(
                      'mt-0.5 truncate text-xs',
                      unread ? 'text-foreground' : 'text-muted-foreground',
                    )}>
                      {conv.last_body ?? '…'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
