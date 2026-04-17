import { useState } from 'react';
import { toast } from 'sonner';
import { useCustomers } from '@/hooks/useCustomers';
import { useIssueStamps } from '@/hooks/useStamps';

const STAMP_OPTIONS = [1, 2, 3, 5];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IssueStampsModal({ open, onOpenChange }: Props) {
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [amount, setAmount] = useState(1);
  const [notify, setNotify] = useState(true);

  const { data: customersRes } = useCustomers({
    ...(search.length > 1 ? { search } : {}),
    optedOut: 'false',
  });

  const issueStamps = useIssueStamps();

  function handleSubmit() {
    if (!selectedCustomerId) {
      toast.error('Bitte einen Kunden auswählen');
      return;
    }
    issueStamps.mutate(
      { customerId: selectedCustomerId, amount, notifyWhatsApp: notify },
      {
        onSuccess: (res) => {
          const { rewardIssued, voucherCodes, newTotal } = res.data;
          let msg: string;
          if (rewardIssued && voucherCodes && voucherCodes.length > 1) {
            msg = `${amount} Stempel! ${voucherCodes.length} Belohnungen 🎉 Codes: ${voucherCodes.join(', ')}`;
          } else if (rewardIssued && res.data.voucherCode) {
            msg = `${amount} Stempel vergeben! Belohnung erhalten 🎉 Code: ${res.data.voucherCode}`;
          } else {
            msg = `${amount} Stempel vergeben. Gesamt: ${newTotal}`;
          }
          toast.success(msg);
          onOpenChange(false);
          setSearch('');
          setSelectedCustomerId('');
          setAmount(1);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold">Stempel vergeben</h2>

        {/* WhatsApp-Benachrichtigung */}
        <button
          onClick={() => setNotify(!notify)}
          className={`mb-4 w-full rounded-xl border-2 p-3 text-left transition-all ${
            notify
              ? 'border-green-500 bg-green-50'
              : 'border-border bg-muted/30'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📱</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${notify ? 'text-green-800' : 'text-muted-foreground'}`}>
                WhatsApp-Benachrichtigung
                {notify
                  ? <span className="ml-2 text-xs font-medium bg-green-500 text-white rounded-full px-2 py-0.5">AN</span>
                  : <span className="ml-2 text-xs font-medium bg-muted text-muted-foreground rounded-full px-2 py-0.5">AUS</span>
                }
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {notify
                  ? 'Kunde erhält Stempelstand + Link zur Stempelkarte'
                  : 'Keine Nachricht senden — zum Aktivieren antippen'}
              </p>
            </div>
          </div>
        </button>

        {/* Customer search */}
        <div className="mb-4 rounded-lg border p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kundendetails</p>
          {selectedCustomerId ? (
            <div className="flex items-center justify-between">
              <span className="font-medium">{selectedCustomerName}</span>
              <button
                className="text-xs text-muted-foreground underline"
                onClick={() => { setSelectedCustomerId(''); setSelectedCustomerName(''); }}
              >
                Ändern
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Mitglied suchen oder hinzufügen…"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {search.length > 1 && customersRes?.data && customersRes.data.length > 0 && (
                <div className="absolute top-full left-0 z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
                  {customersRes.data.map((c) => (
                    <button
                      key={c.id}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                      onClick={() => {
                        setSelectedCustomerId(c.id);
                        setSelectedCustomerName(c.display_name ?? c.phone_display);
                        setSearch('');
                      }}
                    >
                      <span className="font-medium">{c.display_name ?? '—'}</span>
                      <span className="text-muted-foreground">{c.phone_display}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stamp amount selector */}
        <div className="mb-4 rounded-lg border p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Anzahl festlegen</p>
          <div className="flex gap-2">
            {STAMP_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setAmount(n)}
                className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
                  amount === n
                    ? 'bg-primary text-primary-foreground'
                    : 'border bg-card hover:bg-accent'
                }`}
              >
                +{n}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="mb-5 rounded-xl bg-slate-900 px-5 py-4 text-white">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold text-green-400 uppercase tracking-wide">Verdiente Stempel</p>
              <p className="text-4xl font-bold">{amount} <span className="text-sm font-normal text-slate-400">STEMPEL</span></p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">GRUNDBETRAG</p>
              <p className="text-sm font-semibold">{amount} STEMPEL</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-md border py-2 text-sm font-medium hover:bg-accent"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={issueStamps.isPending || !selectedCustomerId}
            className="flex-1 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {issueStamps.isPending ? 'Wird vergeben…' : 'Stempel vergeben'}
          </button>
        </div>
      </div>
    </div>
  );
}
