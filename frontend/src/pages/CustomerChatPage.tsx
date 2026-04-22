import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Send, Stamp, Gift, LogIn, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useCustomer } from '@/hooks/useCustomers';
import { useMessages, useSendMessage } from '@/hooks/useMessages';
import { useCustomerActivity } from '@/hooks/useCustomerActivity';
import { markConversationSeen } from '@/hooks/useConversations';
import { cn } from '@/lib/utils';
import type { WaMessage } from '@/hooks/useMessages';
import type { ActivityEvent } from '@/hooks/useCustomerActivity';

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_ICONS: Record<string, string> = {
  sent:      '✓',
  delivered: '✓✓',
  read:      '✓✓',
  failed:    '✗',
};

const EVENT_META: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  stamp_issued:   { label: 'Stempel vergeben',   Icon: Stamp,  color: 'text-blue-600 bg-blue-50 border-blue-200' },
  voucher_issued: { label: 'Belohnung erhalten',  Icon: Gift,   color: 'text-amber-600 bg-amber-50 border-amber-200' },
  opt_in:         { label: 'Opt-in',              Icon: LogIn,  color: 'text-green-600 bg-green-50 border-green-200' },
  opt_out:        { label: 'Opt-out',             Icon: LogOut, color: 'text-red-600 bg-red-50 border-red-200' },
  blast:          { label: 'Broadcast gesendet',  Icon: Send,   color: 'text-violet-600 bg-violet-50 border-violet-200' },
};

type ChatItem =
  | { kind: 'message'; data: WaMessage }
  | { kind: 'event';   data: ActivityEvent };

function mergeSorted(messages: WaMessage[], events: ActivityEvent[]): ChatItem[] {
  const items: ChatItem[] = [
    ...messages.map((m): ChatItem => ({ kind: 'message', data: m })),
    ...events.map((e): ChatItem  => ({ kind: 'event',   data: e })),
  ];
  return items.sort(
    (a, b) => new Date(a.data.created_at).getTime() - new Date(b.data.created_at).getTime(),
  );
}

export function CustomerChatPage() {
  const { id } = useParams<{ id: string }>();
  const { data: customer } = useCustomer(id ?? '');
  const { data, isLoading } = useMessages(id ?? '');
  const { data: activity } = useCustomerActivity(id ?? '');
  const sendMessage = useSendMessage(id ?? '');
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = [...(data?.data ?? [])].reverse(); // API newest-first → oldest-first
  const items = mergeSorted(messages, activity ?? []);

  // Mark conversation as read when the chat is opened or new messages arrive
  useEffect(() => {
    if (id) markConversationSeen(id);
  }, [id, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items.length]);

  function handleSend() {
    const body = text.trim();
    if (!body) return;
    setText('');
    sendMessage.mutate(body, {
      onError: () => toast.error('Nachricht konnte nicht gesendet werden'),
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3 bg-card">
        <Link
          to={`/customers/${id}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </Link>
        <div className="ml-2">
          <p className="font-semibold text-sm">{customer?.display_name ?? 'Kunde'}</p>
          <p className="text-xs text-muted-foreground">{customer?.phone_display}</p>
        </div>
        <div className="ml-auto text-xs text-muted-foreground">
          {data?.total ?? 0} Nachrichten
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-muted/20">
        {isLoading && (
          <p className="text-center text-sm text-muted-foreground py-8">Wird geladen…</p>
        )}
        {!isLoading && items.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            Noch keine Nachrichten. Sende die erste Nachricht!
          </p>
        )}

        {items.map((item) => {
          if (item.kind === 'event') {
            const evt = item.data;
            const meta = EVENT_META[evt.event_type];
            if (!meta) return null;
            const { Icon, label, color } = meta;
            return (
              <div key={`evt-${evt.id}`} className="flex justify-center">
                <div className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium',
                  color,
                )}>
                  <Icon className="h-3 w-3" />
                  <span>{label}</span>
                  <span className="opacity-60">· {formatTime(evt.created_at)}</span>
                </div>
              </div>
            );
          }

          const msg = item.data;
          return (
            <div
              key={`msg-${msg.id}`}
              className={cn(
                'flex',
                msg.direction === 'outbound' ? 'justify-end' : 'justify-start',
              )}
            >
              <div
                className={cn(
                  'max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm',
                  msg.direction === 'outbound'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-card text-foreground rounded-bl-sm border',
                )}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                <div
                  className={cn(
                    'flex items-center gap-1 mt-1 text-[10px]',
                    msg.direction === 'outbound' ? 'text-primary-foreground/70 justify-end' : 'text-muted-foreground',
                  )}
                >
                  <span>{formatTime(msg.created_at)}</span>
                  {msg.direction === 'outbound' && (
                    <span className={cn(msg.status === 'read' ? 'text-blue-300' : '')}>
                      {STATUS_ICONS[msg.status] ?? '✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-card px-4 py-3">
        {customer?.opted_out_at ? (
          <p className="text-center text-sm text-muted-foreground">
            Dieser Kunde hat sich abgemeldet — keine Nachrichten möglich.
          </p>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nachricht schreiben… (Enter zum Senden)"
              rows={2}
              className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || sendMessage.isPending}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
