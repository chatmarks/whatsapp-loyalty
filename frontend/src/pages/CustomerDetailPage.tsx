import { useParams, Link } from 'react-router-dom';
import { ExternalLink, MessageSquare } from 'lucide-react';
import { useCustomer } from '@/hooks/useCustomers';
import { useBusiness } from '@/hooks/useBusiness';
import { formatDate, formatDateTime } from '@/lib/utils';

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: customer, isLoading } = useCustomer(id ?? '');
  const { data: business } = useBusiness();

  if (isLoading) return <div className="p-6 text-muted-foreground">Wird geladen…</div>;
  if (!customer) return <div className="p-6 text-destructive">Kunde nicht gefunden</div>;

  const stampCount = business?.stamp_count ?? 10;
  const walletUrl = business?.slug && customer.wallet_token
    ? `/r/${business.slug}/wallet/${customer.wallet_token}`
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold">{customer.display_name ?? 'Kunde'}</h1>
        <Link
          to={`/customers/${id}/chat`}
          className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          <MessageSquare className="h-4 w-4" />
          Chat
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Aktuelle Stempel</p>
          <p className="mt-1 text-3xl font-bold">
            {customer.total_stamps}
            <span className="text-lg font-normal text-muted-foreground">/{stampCount}</span>
          </p>
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
          {customer.customer_code && (
            <><span>Kundencode</span><span className="text-foreground font-mono font-semibold tracking-wider">{customer.customer_code}</span></>
          )}
          <span>Telefon</span><span className="text-foreground">{customer.phone_display}</span>
          <span>Beigetreten</span><span className="text-foreground">{formatDate(customer.opted_in_at)}</span>
          {customer.last_interaction_at && (
            <><span>Zuletzt aktiv</span><span className="text-foreground">{formatDateTime(customer.last_interaction_at)}</span></>
          )}
          {customer.referral_code && (
            <><span>Empfehlungscode</span><span className="text-foreground font-mono">{customer.referral_code}</span></>
          )}
          {walletUrl && (
            <>
              <span>Wallet</span>
              <a
                href={walletUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                Stempelkarte öffnen <ExternalLink className="h-3 w-3" />
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
