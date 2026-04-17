import { useParams } from 'react-router-dom';
import { useCustomer } from '@/hooks/useCustomers';
import { formatDate, formatDateTime } from '@/lib/utils';

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: customer, isLoading } = useCustomer(id ?? '');

  if (isLoading) return <div className="p-6 text-muted-foreground">Wird geladen…</div>;
  if (!customer) return <div className="p-6 text-destructive">Kunde nicht gefunden</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{customer.display_name ?? 'Kunde'}</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Aktuelle Stempel</p>
          <p className="mt-1 text-3xl font-bold">{customer.total_stamps}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Stempel gesamt</p>
          <p className="mt-1 text-3xl font-bold">{customer.lifetime_stamps}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
          <p className="mt-1 text-sm font-semibold">
            {customer.opted_out_at ? (
              <span className="text-destructive">Abgemeldet</span>
            ) : (
              <span className="text-green-600">Aktiv</span>
            )}
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-3 text-sm">
        <h2 className="font-semibold">Details</h2>
        <div className="grid grid-cols-2 gap-2 text-muted-foreground">
          <span>Telefon</span><span className="text-foreground">{customer.phone_display}</span>
          <span>Beigetreten</span><span className="text-foreground">{formatDate(customer.opted_in_at)}</span>
          {customer.last_interaction_at && (
            <><span>Zuletzt aktiv</span><span className="text-foreground">{formatDateTime(customer.last_interaction_at)}</span></>
          )}
          {customer.referral_code && (
            <><span>Empfehlungscode</span><span className="text-foreground font-mono">{customer.referral_code}</span></>
          )}
        </div>
      </div>
    </div>
  );
}
