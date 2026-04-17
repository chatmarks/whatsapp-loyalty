import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useOrders, useUpdateOrderStatus } from '@/hooks/useOrders';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';
import type { OrderStatus } from '@/types';

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<'all' | OrderStatus, string> = {
  all: 'Alle',
  pending: 'Offen',
  paid: 'Bezahlt',
  cancelled: 'Storniert',
};

export function OrdersPage() {
  const [status, setStatus] = useState<'all' | OrderStatus>('all');
  const { data, isLoading } = useOrders({ status });
  const navigate = useNavigate();
  const updateStatus = useUpdateOrderStatus();

  function markPaid(id: string) {
    updateStatus.mutate(
      { id, status: 'paid' },
      { onSuccess: () => toast.success('Bestellung als bezahlt markiert'), onError: (e) => toast.error(e.message) },
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bestellungen</h1>
        <button
          onClick={() => navigate('/orders/new')}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Neue Bestellung
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2">
        {(['all', 'pending', 'paid', 'cancelled'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              status === s ? 'bg-primary text-primary-foreground' : 'border hover:bg-accent'
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Bestellung</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Gesamt</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Datum</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Wird geladen…</td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Keine Bestellungen</td></tr>
            ) : (
              data?.data.map((o) => (
                <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{o.id.slice(0, 8)}…</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[o.status]}`}>
                      {STATUS_LABELS[o.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(o.total)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{formatDateTime(o.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {o.status === 'pending' && (
                      <button
                        onClick={() => markPaid(o.id)}
                        className="rounded-md bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700"
                      >
                        Als bezahlt markieren
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
