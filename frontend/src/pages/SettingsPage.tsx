import { useState } from 'react';
import { toast } from 'sonner';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useBusiness, useUpdateBusiness } from '@/hooks/useBusiness';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type Tab = 'allgemein' | 'treuekarte' | 'erscheinungsbild' | 'qrcode' | 'abonnement';

const TABS: { id: Tab; label: string }[] = [
  { id: 'allgemein',        label: 'Allgemein' },
  { id: 'treuekarte',       label: 'Treuekarte' },
  { id: 'erscheinungsbild', label: 'Erscheinungsbild' },
  { id: 'qrcode',           label: 'QR-Code' },
  { id: 'abonnement',       label: 'Abonnement' },
];

// ── Allgemein ────────────────────────────────────────────────────────────────
function AllgemeinTab() {
  const { data: business } = useBusiness();
  const updateBusiness = useUpdateBusiness();
  const [businessName, setBusinessName] = useState(business?.business_name ?? '');

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4 max-w-lg">
      <h2 className="font-semibold text-sm">Unternehmensprofil</h2>
      <div>
        <label className="text-sm font-medium">Unternehmensname</label>
        <input
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div>
        <label className="text-sm font-medium">URL-Kürzel</label>
        <input
          value={business?.slug ?? ''}
          disabled
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Das URL-Kürzel kann nach der Registrierung nicht mehr geändert werden.
        </p>
      </div>
      <button
        onClick={() =>
          updateBusiness.mutate(
            { business_name: businessName } as Parameters<typeof updateBusiness.mutate>[0],
            {
              onSuccess: () => toast.success('Einstellungen gespeichert'),
              onError: (e) => toast.error(e.message),
            },
          )
        }
        disabled={updateBusiness.isPending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        Änderungen speichern
      </button>
    </div>
  );
}

// ── Treuekarte ───────────────────────────────────────────────────────────────
const STAMP_COUNT_OPTIONS = [5, 6, 7, 8, 9, 10, 11, 12];

interface RewardStage { stamp: number; description: string }

function TreuekarteDot({
  index,
  stampCount,
  stages,
  onToggle,
}: {
  index: number;       // 1-based stamp position
  stampCount: number;
  stages: RewardStage[];
  onToggle: (pos: number) => void;
}) {
  const isReward = stages.some((s) => s.stamp === index);
  const isLast   = index === stampCount;

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
      {isReward ? '🎁' : isLast ? '⭐' : (
        <span className="text-xs font-bold text-muted-foreground">{index}</span>
      )}
    </button>
  );
}

function TreuekartTab() {
  const { data: business } = useBusiness();
  const updateBusiness = useUpdateBusiness();

  const [stampCount, setStampCount] = useState<number>(
    business?.stamp_count ?? business?.stamps_per_reward ?? 10,
  );
  const [stages, setStages] = useState<RewardStage[]>(
    business?.reward_stages?.length
      ? business.reward_stages
      : [{ stamp: business?.stamp_count ?? 10, description: 'Gratis Produkt' }],
  );

  // Keep stages valid when stampCount shrinks
  function handleSetStampCount(n: number) {
    setStampCount(n);
    setStages((prev) => prev.filter((s) => s.stamp <= n));
  }

  function toggleStage(pos: number) {
    setStages((prev) => {
      const existing = prev.findIndex((s) => s.stamp === pos);
      if (existing >= 0) {
        // Remove stage (but keep at least one — the last slot)
        if (prev.length === 1) return prev;
        return prev.filter((_, i) => i !== existing);
      }
      return [...prev, { stamp: pos, description: '' }].sort((a, b) => a.stamp - b.stamp);
    });
  }

  function updateDesc(pos: number, description: string) {
    setStages((prev) =>
      prev.map((s) => (s.stamp === pos ? { ...s, description } : s)),
    );
  }

  function handleSave() {
    const invalid = stages.some((s) => !s.description.trim());
    if (invalid) {
      toast.error('Bitte alle Belohnungsbeschreibungen ausfüllen');
      return;
    }
    // Ensure last stamp is always a reward stage
    const hasFinal = stages.some((s) => s.stamp === stampCount);
    const finalStages = hasFinal
      ? stages
      : [...stages, { stamp: stampCount, description: 'Gratis Produkt' }].sort(
          (a, b) => a.stamp - b.stamp,
        );

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
      {/* Stamp count selector */}
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

      {/* Visual grid editor */}
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
              <TreuekarteDot
                index={pos}
                stampCount={stampCount}
                stages={stages}
                onToggle={toggleStage}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Stage descriptions */}
      {stages.length > 0 && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold">Belohnungen benennen</h3>
          {stages
            .sort((a, b) => a.stamp - b.stamp)
            .map((stage) => (
              <div key={stage.stamp} className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 border-2 border-amber-400 text-base">
                  🎁
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Stempel {stage.stamp}</p>
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

// ── Erscheinungsbild ─────────────────────────────────────────────────────────
function ErscheinungsbildTab() {
  const { data: business } = useBusiness();
  const updateBusiness = useUpdateBusiness();
  const [primaryColor, setPrimaryColor] = useState(business?.primary_color ?? '#25D366');

  return (
    <div className="rounded-xl border bg-card p-5 space-y-5 max-w-lg">
      <div>
        <label className="text-sm font-medium">Primärfarbe</label>
        <div className="mt-2 flex items-center gap-3">
          <input
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="h-10 w-16 cursor-pointer rounded border"
          />
          <span className="text-sm text-muted-foreground font-mono">{primaryColor}</span>
        </div>
      </div>
      <button
        onClick={() =>
          updateBusiness.mutate(
            { primary_color: primaryColor } as Parameters<typeof updateBusiness.mutate>[0],
            {
              onSuccess: () => toast.success('Gespeichert'),
              onError: (e) => toast.error(e.message),
            },
          )
        }
        disabled={updateBusiness.isPending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {updateBusiness.isPending ? 'Wird gespeichert…' : 'Speichern'}
      </button>
    </div>
  );
}

// ── QR-Code ──────────────────────────────────────────────────────────────────
function QrCodeTab() {
  const { data: business } = useBusiness();
  const registrationUrl = business ? `${window.location.origin}/r/${business.slug}` : '';

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4 max-w-sm text-center">
      <p className="text-sm text-muted-foreground">
        Kunden scannen diesen Code, um deinem Treueprogramm beizutreten.
      </p>
      {registrationUrl && (
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs font-mono break-all text-foreground">{registrationUrl}</p>
        </div>
      )}
      <button
        onClick={() => { navigator.clipboard.writeText(registrationUrl); toast.success('Link kopiert'); }}
        className="rounded-md border px-4 py-2 text-sm hover:bg-accent transition-colors"
      >
        Link kopieren
      </button>
    </div>
  );
}

// ── Abonnement ───────────────────────────────────────────────────────────────
interface SubscriptionData { plan: string; subscriptionId: string | null }

function AbonnementTab() {
  const { data } = useQuery({
    queryKey: ['payments', 'subscription'],
    queryFn: () => api.get<{ data: SubscriptionData }>('/payments/subscription').then((r) => r.data),
  });

  const checkout = useMutation({
    mutationFn: (plan: string) =>
      api.post<{ data: { url: string } }>('/payments/checkout', { plan }).then((r) => r.data),
    onSuccess: ({ url }) => { if (url) window.location.href = url; },
    onError: (e) => toast.error(e.message),
  });

  const portal = useMutation({
    mutationFn: () =>
      api.post<{ data: { url: string } }>('/payments/portal', {}).then((r) => r.data),
    onSuccess: ({ url }) => { if (url) window.location.href = url; },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4 max-w-lg">
      <div className="rounded-xl border bg-card p-5">
        <p className="text-sm font-medium text-muted-foreground">Aktueller Plan</p>
        <p className="mt-1 text-2xl font-bold capitalize">{data?.plan ?? '—'}</p>
        {data?.subscriptionId && (
          <button
            onClick={() => portal.mutate()}
            disabled={portal.isPending}
            className="mt-3 rounded-md border px-4 py-2 text-sm hover:bg-accent disabled:opacity-50"
          >
            Abonnement verwalten
          </button>
        )}
      </div>
      {data?.plan === 'free' && (
        <div className="grid gap-4 sm:grid-cols-2">
          {['starter', 'pro'].map((plan) => (
            <div key={plan} className="rounded-xl border bg-card p-5 space-y-3">
              <h2 className="font-semibold capitalize">{plan}</h2>
              <button
                onClick={() => checkout.mutate(plan)}
                disabled={checkout.isPending}
                className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Auf {plan} upgraden
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Hauptseite ───────────────────────────────────────────────────────────────
export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(tabParam ?? 'allgemein');

  function switchTab(id: Tab) {
    setActiveTab(id);
    if (id === 'allgemein') {
      setSearchParams({});
    } else {
      setSearchParams({ tab: id });
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Einstellungen</h1>

      {/* Tab-Leiste */}
      <div className="flex gap-1 border-b">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => switchTab(id)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab-Inhalt */}
      {activeTab === 'allgemein'        && <AllgemeinTab />}
      {activeTab === 'treuekarte'       && <TreuekartTab />}
      {activeTab === 'erscheinungsbild' && <ErscheinungsbildTab />}
      {activeTab === 'qrcode'           && <QrCodeTab />}
      {activeTab === 'abonnement'       && <AbonnementTab />}
    </div>
  );
}
