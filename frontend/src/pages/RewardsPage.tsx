import { useState } from 'react';
import { toast } from 'sonner';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';
import { useVouchers, useRedeemVoucher } from '@/hooks/useVouchers';
import { useBusiness, useUpdateBusiness } from '@/hooks/useBusiness';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

// ── Tab navigation ────────────────────────────────────────────────────────────

type Tab = 'belohnungen' | 'treuekarte';

// ── Voucher list tab ─────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  redeemed: { label: 'Eingelöst', color: 'text-green-600' },
  claimed:  { label: 'Abgeholt',  color: 'text-amber-600' },
  active:   { label: 'Aktiv',     color: 'text-blue-600' },
};

function BelohnungenTab() {
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

// ── Treuekarte tab ────────────────────────────────────────────────────────────

const STAMP_COUNT_OPTIONS = [5, 6, 7, 8, 9, 10, 11, 12];

interface RewardStage { stamp: number; description: string; emoji?: string }

function TreuekarteDot({
  index,
  stampCount,
  stages,
  onToggle,
}: {
  index: number;
  stampCount: number;
  stages: RewardStage[];
  onToggle: (pos: number) => void;
}) {
  const stage    = stages.find((s) => s.stamp === index);
  const isReward = !!stage;
  const isLast   = index === stampCount;
  const emoji    = stage?.emoji ?? (isLast ? '⭐' : '🎁');

  return (
    <button
      type="button"
      title={isReward ? 'Belohnung entfernen' : 'Als Belohnung markieren'}
      onClick={() => onToggle(index)}
      className={cn(
        'relative flex h-12 w-12 items-center justify-center rounded-full border-2 text-xl transition-all',
        isReward
          ? 'border-amber-400 bg-amber-50 shadow-md hover:bg-amber-100'
          : isLast
          ? 'border-primary/60 bg-primary/10 hover:bg-primary/20'
          : 'border-muted-foreground/30 bg-muted/40 hover:bg-muted',
      )}
    >
      {isReward ? emoji : isLast ? '⭐' : (
        <span className="text-xs font-bold text-muted-foreground">{index}</span>
      )}
    </button>
  );
}

function TreuekartTab() {
  const { data: business } = useBusiness();
  const updateBusiness = useUpdateBusiness();

  // Which stage's emoji picker is open (stamp position), or null
  const [emojiPickerFor, setEmojiPickerFor] = useState<number | null>(null);

  const [stampCount, setStampCount] = useState<number>(
    business?.stamp_count ?? business?.stamps_per_reward ?? 10,
  );
  const [stages, setStages] = useState<RewardStage[]>(() => {
    const base = business?.reward_stages?.length
      ? business.reward_stages
      : [{ stamp: business?.stamp_count ?? 10, description: 'Gratis Produkt', emoji: '🎁' }];
    const count = business?.stamp_count ?? business?.stamps_per_reward ?? 10;
    if (!base.some((s) => s.stamp === count)) {
      return [...base, { stamp: count, description: 'Gratis Produkt', emoji: '⭐' }].sort((a, b) => a.stamp - b.stamp);
    }
    return base;
  });

  function handleSetStampCount(n: number) {
    setStampCount(n);
    setStages((prev) => prev.filter((s) => s.stamp <= n));
  }

  function toggleStage(pos: number) {
    setStages((prev) => {
      const existing = prev.findIndex((s) => s.stamp === pos);
      if (existing >= 0) {
        if (prev.length === 1) return prev;
        return prev.filter((_, i) => i !== existing);
      }
      return [...prev, { stamp: pos, description: '', emoji: '🎁' }].sort((a, b) => a.stamp - b.stamp);
    });
  }

  function updateDesc(pos: number, description: string) {
    setStages((prev) => prev.map((s) => (s.stamp === pos ? { ...s, description } : s)));
  }

  function handleEmojiSelect(pos: number, data: EmojiClickData) {
    setStages((prev) => prev.map((s) => (s.stamp === pos ? { ...s, emoji: data.emoji } : s)));
    setEmojiPickerFor(null);
  }

  function handleSave() {
    const invalid = stages.some((s) => !s.description.trim());
    if (invalid) { toast.error('Bitte alle Belohnungsbeschreibungen ausfüllen'); return; }
    const hasFinal = stages.some((s) => s.stamp === stampCount);
    const finalStages = hasFinal
      ? stages
      : [...stages, { stamp: stampCount, description: 'Gratis Produkt', emoji: '⭐' }].sort((a, b) => a.stamp - b.stamp);

    updateBusiness.mutate(
      { stampCount, rewardStages: finalStages } as Parameters<typeof updateBusiness.mutate>[0],
      {
        onSuccess: () => toast.success('Treuekarte gespeichert'),
        onError: (e) => toast.error(e.message),
      },
    );
  }

  const cols = Math.min(5, stampCount);

  return (
    <div className="space-y-6 max-w-lg">
      {/* Stamp count */}
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Anzahl Stempel</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Wie viele Stempel passen auf die Karte?</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {STAMP_COUNT_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => handleSetStampCount(n)}
              className={cn(
                'h-9 w-9 rounded-lg text-sm font-semibold border transition-colors',
                stampCount === n
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border bg-card hover:bg-accent',
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Stage grid */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Belohnungsstufen</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tippe auf ein Feld, um es als Belohnung zu markieren.
            🎁 = Belohnung · ⭐ = letzter Stempel (immer Belohnung)
          </p>
        </div>
        <div
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          className="grid gap-2"
        >
          {Array.from({ length: stampCount }, (_, i) => i + 1).map((pos) => (
            <div key={pos} className="flex flex-col items-center gap-1">
              <TreuekarteDot index={pos} stampCount={stampCount} stages={stages} onToggle={toggleStage} />
            </div>
          ))}
        </div>
      </div>

      {/* Stage editor with emoji picker */}
      {stages.length > 0 && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold">Belohnungen benennen</h3>
          {stages.sort((a, b) => a.stamp - b.stamp).map((stage) => (
            <div key={stage.stamp} className="flex items-start gap-3">
              {/* Emoji button + picker */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setEmojiPickerFor(emojiPickerFor === stage.stamp ? null : stage.stamp)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 border-2 border-amber-400 text-base hover:bg-amber-100 transition-colors"
                  title="Emoji wählen"
                >
                  {stage.emoji ?? '🎁'}
                </button>
                {emojiPickerFor === stage.stamp && (
                  <div className="absolute left-0 top-11 z-50">
                    <EmojiPicker
                      onEmojiClick={(data) => handleEmojiSelect(stage.stamp, data)}
                      searchPlaceholder="Suchen…"
                      height={350}
                      width={300}
                    />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-xs text-muted-foreground">
                  Stempel {stage.stamp}{stage.stamp === stampCount ? ' (Letzter Stempel)' : ''}
                </p>
                <input
                  value={stage.description}
                  onChange={(e) => updateDesc(stage.stamp, e.target.value)}
                  placeholder="z.B. Gratis Kaffee"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={updateBusiness.isPending}
        className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {updateBusiness.isPending ? 'Wird gespeichert…' : 'Treuekarte speichern'}
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function RewardsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('belohnungen');
  const { data } = useVouchers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Belohnungen</h1>
        {activeTab === 'belohnungen' && data && (
          <p className="mt-1 text-sm text-muted-foreground">
            {data.total} Belohnungen insgesamt
          </p>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b">
        {([
          { id: 'belohnungen', label: 'Ausgestellte Belohnungen' },
          { id: 'treuekarte',  label: 'Treuekarte' },
        ] as { id: Tab; label: string }[]).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              activeTab === id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'belohnungen' && <BelohnungenTab />}
      {activeTab === 'treuekarte'  && <TreuekartTab />}
    </div>
  );
}
