import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useCustomers } from '@/hooks/useCustomers';
import { useBusiness } from '@/hooks/useBusiness';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

function StatusPill({ optedOutAt }: { optedOutAt: string | null }) {
  if (optedOutAt) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
        Abgemeldet
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
      Aktiv
    </span>
  );
}

export function CustomersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  // No optedOut filter — show all customers
  const { data, isLoading } = useCustomers({ ...(search ? { search } : {}), page });
  const { data: business } = useBusiness();
  const navigate = useNavigate();
  const stampCount = business?.stamp_count ?? 10;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Kunden</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Nach Name suchen…"
          className="flex h-10 w-full max-w-sm rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Telefon</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Stempel</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Beigetreten</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Wird geladen…</td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Noch keine Kunden</td></tr>
            ) : (
              data?.data.map((c) => (
                <tr
                  key={c.id}
                  className={cn(
                    'border-b last:border-0 cursor-pointer hover:bg-muted/30 transition-colors',
                    c.opted_out_at && 'opacity-60',
                  )}
                  onClick={() => navigate(`/customers/${c.id}`)}
                >
                  <td className="px-4 py-3 font-medium">{c.display_name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.phone_display}</td>
                  <td className="px-4 py-3"><StatusPill optedOutAt={c.opted_out_at} /></td>
                  <td className="px-4 py-3 text-right font-semibold">{c.total_stamps}/{stampCount}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{formatDate(c.opted_in_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.total > data.pageSize && (
        <div className="flex justify-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
          >
            Zurück
          </button>
          <span className="px-3 py-1 text-sm text-muted-foreground">
            Seite {page} von {Math.ceil(data.total / data.pageSize)}
          </span>
          <button
            disabled={page >= Math.ceil(data.total / data.pageSize)}
            onClick={() => setPage(page + 1)}
            className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
          >
            Weiter
          </button>
        </div>
      )}
    </div>
  );
}
