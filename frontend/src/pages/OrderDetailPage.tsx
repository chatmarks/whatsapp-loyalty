import { useParams } from 'react-router-dom';
import { useOrder } from '@/hooks/useOrders';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading } = useOrder(id ?? '');

  if (isLoading) return <div className="p-6 text-muted-foreground">Wird geladen…</div>;
  if (!order) return <div className="p-6 text-destructive">Bestellung nicht gefunden</div>;

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold">Bestelldetails</h1>

      <div className="rounded-xl border bg-card p-5 space-y-3 text-sm">
        <div className="flex justify-between font-semibold">
          <span>Status</span>
          <span className="capitalize">{order.status}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Datum</span>
          <span>{formatDateTime(order.created_at)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Zahlung</span>
          <span className="capitalize">{order.payment_method ?? '—'}</span>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <p className="mb-3 font-semibold text-sm">Artikel</p>
        <ul className="space-y-2 text-sm">
          {order.line_items.map((item, i) => (
            <li key={i} className="flex justify-between">
              <span>{item.qty}× {item.name}</span>
              <span className="font-medium">{formatCurrency(item.qty * item.unit_price)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 border-t pt-3 flex justify-between font-bold">
          <span>Gesamt</span>
          <span>{formatCurrency(order.total)}</span>
        </div>
      </div>
    </div>
  );
}
