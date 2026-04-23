import { useState } from 'react';
import { toast } from 'sonner';
import { useVouchers, useRedeemVoucher } from '@/hooks/useVouchers';
import { formatDate } from '@/lib/utils';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  redeemed: { label: 'Eingelöst',  color: 'text-green-600' },
  claimed:  { label: 'Abgeholt',   color: 'text-amber-600' },
  active:   { label: 'Aktiv',      color: 'text-blue-600' },
};

export function RewardsPage() {
  const [redeemCode, setRedeemCode] = useState('');
  const { data, isLoading } = useVouchers();
  const redeem = useRedeemVoucher();

  function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    redeem.mutate(redeemCode.trim().toUpperCase(), {
      onSuccess: () => { toast.success('Belohnung eingelöst!'); setRedeemCode(''); },
      onError: (e) => toast.error(e.message),
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Belohnungen</h1>
        {data && (
          <p className="mt-1 text-sm text-muted-foreground">
            {data.total} Belohnungen insgesamt
          </p>
        )}
      </div>

      {/* Redeem form */}
      <div className="rounded-xl border bg-card p-5 max-w-lg">
        <h2 className="mb-3 font-semibold text-sm">Belohnung einlösen</h2>
        <form onSubmit={handleRedeem} className="flex gap-2">
          <input
            value={redeemCode}
            onChange={(e) => setRedeemCode(e.target.value)}
            placeholder="Code eingeben…"
            className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm uppercase placeholder:normal-case placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            disabled={!redeemCode || redeem.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Einlösen
          </button>
        </form>
      </div>

      {/* Reward list */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Beschreibung</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kunde</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ausgestellt</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Wird geladen…</td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Noch keine Belohnungen</td></tr>
            ) : (
              data?.data.map((v) => {
                const statusKey = v.redeemed_at ? 'redeemed' : v.claimed_at ? 'claimed' : 'active';
                const status = STATUS_LABELS[statusKey]!;
                return (
                  <tr key={v.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold tracking-wider">{v.code}</td>
                    <td className="px-4 py-3">{v.description}</td>
                    <td className="px-4 py-3 text-muted-foreground">—</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatDate(v.issued_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs font-semibold ${status.color}`}>{status.label}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
