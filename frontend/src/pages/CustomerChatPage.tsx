import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useCustomer } from '@/hooks/useCustomers';
import { useMessages, useSendMessage } from '@/hooks/useMessages';
import { cn } from '@/lib/utils';

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

export function CustomerChatPage() {
  const { id } = useParams<{ id: string }>();
  const { data: customer } = useCustomer(id ?? '');
  const { data, isLoading } = useMessages(id ?? '');
  const sendMessage = useSendMessage(id ?? '');
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = [...(data?.data ?? [])].reverse(); // API returns newest-first, reverse for display

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

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
        {!isLoading && messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            Noch keine Nachrichten. Sende die erste Nachricht!
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
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
        ))}
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
