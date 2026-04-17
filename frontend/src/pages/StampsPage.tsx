import { useState } from 'react';
import { Stamp } from 'lucide-react';
import { useStampEvents } from '@/hooks/useStamps';
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

      {/* Tabelle */}
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
                  {event.customer?.display_name ?? <span className="text-muted-foreground">Unbekannt</span>}
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

        {/* Pagination */}
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
