import { useState } from 'react';
import { Stamp, Check, X, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useStampEvents } from '@/hooks/useStamps';
import {
  usePendingStampRequests,
  useApproveStampRequest,
  useDeclineStampRequest,
} from '@/hooks/useStampRequests';
import { IssueStampsModal } from '@/components/stamps/IssueStampsModal';
import { cn } from '@/lib/utils';

const SOURCE_LABELS: Record<string, string> = {
  manual:   'Manuell',
  order:    'Bestellung',
  referral: 'Empfehlung',
  keyword:  'WhatsApp',
};

const SOURCE_COLORS: Record<string, string> = {
  manual:   'bg-blue-100 text-blue-700',
  order:    'bg-green-100 text-green-700',
  referral: 'bg-violet-100 text-violet-700',
  keyword:  'bg-emerald-100 text-emerald-700',
};

// ── Pending requests section ──────────────────────────────────────────────────

function PendingRequests() {
  const { data: pending } = usePendingStampRequests();
  const approve = useApproveStampRequest();
  const decline = useDeclineStampRequest();

  if (!pending?.length) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-100/60 px-4 py-2.5">
        <Clock className="h-4 w-4 text-amber-600" />
        <span className="text-sm font-semibold text-amber-800">
          Offene Stempel-Anfragen ({pending.length})
        </span>
        <span className="ml-auto text-xs text-amber-600">
          Fallback-Ansicht — wird auch im Modal angezeigt
        </span>
      </div>

      <div className="divide-y divide-amber-100">
        {pending.map((req) => {
          const name = req.display_name ?? req.wa_contact_name ?? req.phone_display;
          const isPending = approve.isPending || decline.isPending;

          return (
            <div key={req.id} className="flex items-center gap-4 px-4 py-3">
              {/* Avatar */}
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: req.primary_color }}
              >
                {name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{name}</p>
                <p className="text-xs text-muted-foreground">
                  {req.total_stamps}/{req.stamp_count} Stempel ·{' '}
                  {new Date(req.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                </p>
              </div>

              {/* Stamp dots — compact */}
              <div
                className="hidden sm:grid gap-1"
                style={{ gridTemplateColumns: `repeat(${Math.min(5, req.stamp_count)}, 1fr)` }}
              >
                {Array.from({ length: req.stamp_count }, (_, i) => i + 1).map((pos) => {
                  const filled   = pos <= req.total_stamps;
                  const isReward = req.reward_stages.some((s) => s.stamp === pos);
                  return (
                    <div
                      key={pos}
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: filled
                          ? isReward ? '#f59e0b' : req.primary_color
                          : 'transparent',
                        border: `1.5px solid ${filled ? 'transparent' : isReward ? '#f59e0b88' : `${req.primary_color}40`}`,
                        opacity: filled ? 1 : 0.4,
                      }}
                    />
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => decline.mutate(req.id, { onSuccess: () => toast('Abgelehnt') })}
                  disabled={isPending}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border hover:bg-muted transition-colors disabled:opacity-50"
                  title="Ablehnen"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
                <button
                  onClick={() =>
                    approve.mutate(req.id, {
                      onSuccess: () => toast.success(`Stempel für ${name} vergeben ✓`),
                      onError: () => toast.error('Fehler'),
                    })
                  }
                  disabled={isPending}
                  className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white transition-colors disabled:opacity-50"
                  style={{ background: req.primary_color }}
                  title="Stempel vergeben"
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  Bestätigen
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function StampsPage() {
  const [open, setOpen]   = useState(false);
  const [page, setPage]   = useState(1);
  const { data, isLoading } = useStampEvents(page);

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stempel</h1>
          {data && (
            <p className="mt-1 text-sm text-muted-foreground">
              {data.total} Vergaben insgesamt
            </p>
          )}
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Stamp className="h-4 w-4" />
          Stempel vergeben
        </button>
      </div>

      {/* Pending stamp requests — fallback when modal is unavailable */}
      <PendingRequests />

      {/* Stamp events table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kunde</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Anzahl</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Quelle</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Datum & Uhrzeit</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  Wird geladen…
                </td>
              </tr>
            )}
            {!isLoading && data?.data.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  Noch keine Stempel vergeben.
                </td>
              </tr>
            )}
            {data?.data.map((event) => (
              <tr key={event.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">
                  {event.customer?.display_name ?? event.customer?.wa_contact_name ?? (
                    <span className="text-muted-foreground">Unbekannt</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-amber-600">+{event.amount}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-medium',
                    SOURCE_COLORS[event.source] ?? 'bg-muted text-muted-foreground',
                  )}>
                    {SOURCE_LABELS[event.source] ?? event.source}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground tabular-nums">
                  {new Date(event.created_at).toLocaleString('de-DE', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-40"
            >
              Zurück
            </button>
            <span className="text-xs text-muted-foreground">
              Seite {page} von {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-40"
            >
              Weiter
            </button>
          </div>
        )}
      </div>

      <IssueStampsModal open={open} onOpenChange={setOpen} />
    </div>
  );
}
