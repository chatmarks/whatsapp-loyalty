import { useState } from 'react';
import { toast } from 'sonner';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useBusiness, useUpdateBusiness } from '@/hooks/useBusiness';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type Tab = 'allgemein' | 'treuekarte' | 'erscheinungsbild' | 'whatsapp' | 'nachrichten' | 'qrcode' | 'abonnement';

const TABS: { id: Tab; label: string }[] = [
  { id: 'allgemein',        label: 'Allgemein' },
  { id: 'treuekarte',       label: 'Treuekarte' },
  { id: 'erscheinungsbild', label: 'Erscheinungsbild' },
  { id: 'whatsapp',         label: 'WhatsApp' },
  { id: 'nachrichten',      label: 'Nachrichten' },
  { id: 'qrcode',           label: 'QR-Code' },
  { id: 'abonnement',       label: 'Abonnement' },
];

// ── Allgemein ────────────────────────────────────────────────────────────────
function AllgemeinTab() {
  const { data: business } = useBusiness();
  const updateBusiness = useUpdateBusiness();
  const [businessName, setBusinessName] = useState(business?.business_name ?? '');
  const [slug, setSlug] = useState(business?.slug ?? '');

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
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Nur Kleinbuchstaben, Zahlen und Bindestriche. Änderungen machen bestehende QR-Codes ungültig.
        </p>
      </div>
      <button
        onClick={() =>
          updateBusiness.mutate(
            { businessName, slug } as Parameters<typeof updateBusiness.mutate>[0],
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
  const stage  = stages.find((s) => s.stamp === index);
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

  const [stampCount, setStampCount] = useState<number>(
    business?.stamp_count ?? business?.stamps_per_reward ?? 10,
  );
  const [stages, setStages] = useState<RewardStage[]>(() => {
    const base = business?.reward_stages?.length
      ? business.reward_stages
      : [{ stamp: business?.stamp_count ?? 10, description: 'Gratis Produkt', emoji: '🎁' }];
    const count = business?.stamp_count ?? business?.stamps_per_reward ?? 10;
    // Ensure the last stamp is always a reward stage
    if (!base.some((s) => s.stamp === count)) {
      return [...base, { stamp: count, description: 'Gratis Produkt', emoji: '⭐' }].sort((a, b) => a.stamp - b.stamp);
    }
    return base;
  });

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
      return [...prev, { stamp: pos, description: '', emoji: '🎁' }].sort((a, b) => a.stamp - b.stamp);
    });
  }

  function updateDesc(pos: number, description: string) {
    setStages((prev) =>
      prev.map((s) => (s.stamp === pos ? { ...s, description } : s)),
    );
  }

  function updateEmoji(pos: number, emoji: string) {
    setStages((prev) =>
      prev.map((s) => (s.stamp === pos ? { ...s, emoji } : s)),
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
      : [...stages, { stamp: stampCount, description: 'Gratis Produkt', emoji: '⭐' }].sort(
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
              <div key={stage.stamp} className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 border-2 border-amber-400 text-base">
                  {stage.emoji ?? '🎁'}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="text-xs text-muted-foreground">
                    Stempel {stage.stamp}{stage.stamp === stampCount ? ' (Letzter Stempel)' : ''}
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={stage.emoji ?? ''}
                      onChange={(e) => updateEmoji(stage.stamp, e.target.value)}
                      placeholder="🎁"
                      className="flex h-9 w-16 rounded-md border border-input bg-background px-2 text-center text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      title="Emoji für diese Belohnung"
                    />
                    <input
                      value={stage.description}
                      onChange={(e) => updateDesc(stage.stamp, e.target.value)}
                      placeholder="z.B. Gratis Kaffee"
                      className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
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
            { primaryColor } as Parameters<typeof updateBusiness.mutate>[0],
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

// ── WhatsApp ─────────────────────────────────────────────────────────────────
function WhatsAppTab() {
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [accessToken, setAccessToken] = useState('');

  const save = useMutation({
    mutationFn: () =>
      api.patch('/businesses/me/whatsapp', { waPhoneNumberId: phoneNumberId, waAccessToken: accessToken }),
    onSuccess: () => toast.success('WhatsApp-Einstellungen gespeichert'),
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4 max-w-lg">
      <h2 className="font-semibold text-sm">Meta WhatsApp Cloud API</h2>
      <p className="text-xs text-muted-foreground">
        Nutze einen permanenten System-User-Token aus dem Meta Business Manager.
        Token wird verschlüsselt gespeichert und nie im Klartext zurückgegeben.
      </p>
      <div>
        <label className="text-sm font-medium">Phone Number ID</label>
        <input
          value={phoneNumberId}
          onChange={(e) => setPhoneNumberId(e.target.value)}
          placeholder="1234567890"
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Access Token</label>
        <input
          type="password"
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          placeholder="EAAxxxxx…"
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <button
        onClick={() => save.mutate()}
        disabled={save.isPending || !phoneNumberId || !accessToken}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {save.isPending ? 'Wird gespeichert…' : 'Speichern'}
      </button>
    </div>
  );
}

// ── Nachrichten ───────────────────────────────────────────────────────────────
const MESSAGE_FIELDS: { key: string; label: string; hint: string }[] = [
  {
    key: 'not_registered',
    label: 'Nicht registriert',
    hint: 'Wird gesendet, wenn ein unbekannter Kontakt ein Keyword schreibt. Nutze {link} für den Registrierungslink.',
  },
  {
    key: 'stamp_cooldown',
    label: 'Cooldown-Hinweis',
    hint: 'Wird bei zu frühem Keyword-Stempel gesendet. Nutze {hours} für die Wartezeit.',
  },
  {
    key: 'stamp_issued',
    label: 'Stempel erhalten',
    hint: 'Benachrichtigung nach Stempel-Vergabe. Variablen: {count}, {total}, {stampCount}.',
  },
  {
    key: 'reward_earned',
    label: 'Belohnung erhalten',
    hint: 'Benachrichtigung bei Belohnung. Variablen: {description}, {code}.',
  },
  {
    key: 'opt_out_confirm',
    label: 'Abmeldung bestätigt',
    hint: 'Bestätigung nach Opt-out. Keine Variablen.',
  },
  {
    key: 'opt_in_welcome',
    label: 'Willkommensnachricht',
    hint: 'Wird nach erfolgreicher Registrierung gesendet. Variablen: {name}, {businessName}.',
  },
];

const DEFAULT_TEMPLATES: Record<string, string> = {
  not_registered: 'Du bist noch nicht registriert. Melde dich hier an und sammle Stempel! 🎉',
  stamp_cooldown: 'Du hast heute bereits einen Stempel erhalten. ⏳\n\nDer nächste ist in ca. {hours} Stunde(n) verfügbar.',
  stamp_issued: 'Du hast {count} Stempel erhalten! 🎉\n\n📍 Aktueller Stand: {total}/{stampCount} Stempel',
  reward_earned: '🎉 Glückwunsch! Du hast deine Belohnung verdient!\n\n🎁 {description}\nDein Code: *{code}*\n\nZeige diesen Code beim nächsten Besuch vor.',
  opt_out_confirm: 'Du wurdest erfolgreich vom Treueprogramm abgemeldet. Auf Wiedersehen! 👋',
  opt_in_welcome: 'Willkommen bei {businessName}, {name}! 🎉\n\nDu bist jetzt Teil unseres Treueprogramms. Schreibe "Stempel" nach deinem nächsten Besuch, um deinen ersten Stempel zu sammeln!',
};

function NachrichtenTab() {
  const { data: business } = useBusiness();
  const updateBusiness = useUpdateBusiness();

  const [templates, setTemplates] = useState<Record<string, string>>(() => ({
    ...DEFAULT_TEMPLATES,
    ...(business?.message_templates ?? {}),
  }));

  function handleSave() {
    updateBusiness.mutate(
      { messageTemplates: templates } as Parameters<typeof updateBusiness.mutate>[0],
      {
        onSuccess: () => toast.success('Nachrichten gespeichert'),
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <p className="text-sm text-muted-foreground">
        Passe die automatisch gesendeten WhatsApp-Nachrichten an. Platzhalter in geschwungenen Klammern werden beim Senden ersetzt.
      </p>
      {MESSAGE_FIELDS.map(({ key, label, hint }) => (
        <div key={key} className="rounded-xl border bg-card p-4 space-y-2">
          <div>
            <p className="text-sm font-semibold">{label}</p>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </div>
          <textarea
            rows={3}
            value={templates[key] ?? DEFAULT_TEMPLATES[key] ?? ''}
            onChange={(e) => setTemplates((prev) => ({ ...prev, [key]: e.target.value }))}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
          <button
            type="button"
            onClick={() => setTemplates((prev) => ({ ...prev, [key]: DEFAULT_TEMPLATES[key] ?? '' }))}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Zurücksetzen
          </button>
        </div>
      ))}
      <button
        onClick={handleSave}
        disabled={updateBusiness.isPending}
        className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {updateBusiness.isPending ? 'Wird gespeichert…' : 'Nachrichten speichern'}
      </button>
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
      {activeTab === 'whatsapp'         && <WhatsAppTab />}
      {activeTab === 'nachrichten'      && <NachrichtenTab />}
      {activeTab === 'qrcode'           && <QrCodeTab />}
      {activeTab === 'abonnement'       && <AbonnementTab />}
    </div>
  );
}
