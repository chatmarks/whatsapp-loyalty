/**
 * Programm-Seite — Loyalty-Programm konfigurieren.
 * Tabs: Treuekarte · Erscheinungsbild · Nachrichten · QR-Code
 *
 * Treuekarte + Nachrichten wurden aus RewardsPage / SettingsPage hierher verschoben.
 */

import { useState } from 'react';
import { toast } from 'sonner';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';
import { useBusiness, useUpdateBusiness } from '@/hooks/useBusiness';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

type Tab = 'treuekarte' | 'erscheinungsbild' | 'nachrichten' | 'qrcode';

const TABS: { id: Tab; label: string }[] = [
  { id: 'treuekarte',      label: 'Treuekarte' },
  { id: 'erscheinungsbild', label: 'Erscheinungsbild' },
  { id: 'nachrichten',     label: 'Nachrichten' },
  { id: 'qrcode',          label: 'QR-Code' },
];

// ── Treuekarte ────────────────────────────────────────────────────────────────

const STAMP_COUNT_OPTIONS = [5, 6, 7, 8, 9, 10, 11, 12];

interface RewardStage { stamp: number; description: string; emoji?: string }

function TreuekarteDot({
  index, stampCount, stages, onToggle,
}: {
  index: number; stampCount: number; stages: RewardStage[]; onToggle: (pos: number) => void;
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
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Anzahl Stempel</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Wie viele Stempel passen auf die Karte?</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {STAMP_COUNT_OPTIONS.map((n) => (
            <button
              key={n} type="button" onClick={() => handleSetStampCount(n)}
              className={cn(
                'h-9 w-9 rounded-lg text-sm font-semibold border transition-colors',
                stampCount === n ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-card hover:bg-accent',
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Belohnungsstufen</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tippe auf ein Feld, um es als Belohnung zu markieren.
            🎁 = Belohnung · ⭐ = letzter Stempel (immer Belohnung)
          </p>
        </div>
        <div style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} className="grid gap-2">
          {Array.from({ length: stampCount }, (_, i) => i + 1).map((pos) => (
            <div key={pos} className="flex flex-col items-center gap-1">
              <TreuekarteDot index={pos} stampCount={stampCount} stages={stages} onToggle={toggleStage} />
            </div>
          ))}
        </div>
      </div>

      {stages.length > 0 && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold">Belohnungen benennen</h3>
          {stages.sort((a, b) => a.stamp - b.stamp).map((stage) => (
            <div key={stage.stamp} className="flex items-start gap-3">
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setEmojiPickerFor(emojiPickerFor === stage.stamp ? null : stage.stamp)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 border-2 border-amber-400 text-base hover:bg-amber-100 transition-colors"
                >
                  {stage.emoji ?? '🎁'}
                </button>
                {emojiPickerFor === stage.stamp && (
                  <div className="absolute left-0 top-11 z-50">
                    <EmojiPicker onEmojiClick={(data) => handleEmojiSelect(stage.stamp, data)} searchPlaceholder="Suchen…" height={350} width={300} />
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
        onClick={handleSave} disabled={updateBusiness.isPending}
        className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {updateBusiness.isPending ? 'Wird gespeichert…' : 'Treuekarte speichern'}
      </button>
    </div>
  );
}

// ── Erscheinungsbild ──────────────────────────────────────────────────────────

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

// ── QR-Code ───────────────────────────────────────────────────────────────────

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

// ── Nachrichten ───────────────────────────────────────────────────────────────

interface TemplateField {
  key: string; label: string; hint: string; variables: string[];
  ctaKey?: string; defaultCta?: string;
}

const TEMPLATE_FIELDS: TemplateField[] = [
  { key: 'stamp_issued',   label: 'Stempel erhalten',      hint: 'Benachrichtigung nach jeder Stempel-Vergabe.',         variables: ['{count}', '{total}', '{stampCount}', '{remaining}'], ctaKey: 'stamp_issued_cta',   defaultCta: 'Stempelkarte öffnen' },
  { key: 'reward_earned',  label: 'Belohnung erhalten',    hint: 'Wird gesendet, wenn ein Reward-Schwellenwert erreicht wird.', variables: ['{description}', '{code}'],                        ctaKey: 'reward_earned_cta',  defaultCta: 'Gutschein ansehen' },
  { key: 'not_registered', label: 'Nicht registriert',     hint: 'Wenn ein unbekannter Kontakt ein Keyword schreibt.',   variables: [],                                                     ctaKey: 'not_registered_cta', defaultCta: 'Jetzt registrieren' },
  { key: 'stamp_cooldown', label: 'Cooldown-Hinweis',      hint: 'Bei zu frühem Keyword-Stempel (8h-Sperre).',           variables: ['{hours}'] },
  { key: 'opt_out_confirm',label: 'Abmeldung bestätigt',   hint: 'Bestätigung nach Opt-out. Keine Variablen.',           variables: [] },
  { key: 'opt_in_welcome', label: 'Willkommensnachricht',  hint: 'Nach erfolgreicher Registrierung gesendet.',           variables: ['{name}', '{businessName}'] },
];

const DEFAULT_BODIES: Record<string, string> = {
  not_registered:  'Du bist noch nicht registriert. Melde dich hier an und sammle Stempel! 🎉',
  stamp_cooldown:  'Du hast heute bereits einen Stempel erhalten. ⏳\n\nDer nächste ist in ca. {hours} Stunde(n) verfügbar.',
  stamp_issued:    'Du hast {count} Stempel erhalten! 🎉\n\n📍 Aktueller Stand: {total}/{stampCount} Stempel\nNoch {remaining} bis zu deiner Belohnung.',
  reward_earned:   '🎉 Glückwunsch! Du hast deine Belohnung verdient!\n\n🎁 {description}\nDein Code: *{code}*\n\nZeige diesen Code beim nächsten Besuch vor.',
  opt_out_confirm: 'Du wurdest erfolgreich vom Treueprogramm abgemeldet. Auf Wiedersehen! 👋',
  opt_in_welcome:  'Willkommen bei {businessName}, {name}! 🎉\n\nDu bist jetzt Teil unseres Treueprogramms. Schreibe "Stempel" nach deinem nächsten Besuch, um deinen ersten Stempel zu sammeln!',
};

const PREVIEW_VARS: Record<string, string> = {
  '{count}': '1', '{total}': '5', '{stampCount}': '10', '{remaining}': '5',
  '{hours}': '6', '{description}': 'Gratis Kaffee', '{code}': 'ABC-123',
  '{name}': 'Max', '{businessName}': 'Café Muster',
};

function applyPreviewVars(text: string): string {
  return Object.entries(PREVIEW_VARS).reduce((t, [k, v]) => t.replaceAll(k, v), text);
}

function WaBubble({ body, ctaLabel }: { body: string; ctaLabel?: string }) {
  return (
    <div className="bg-[#ECE5DD] rounded-xl p-4 max-w-xs">
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-3 py-2.5">
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words text-[#111B21]">
            {applyPreviewVars(body)}
          </p>
          <p className="text-[10px] text-[#667781] mt-1 text-right">12:34 ✓✓</p>
        </div>
        {ctaLabel && (
          <div className="border-t border-[#E9EDEF]">
            <button className="w-full py-2.5 text-[13px] font-medium text-[#00A884] text-center hover:bg-[#F5F6F6] transition-colors">
              {ctaLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function NachrichtenTab() {
  const { data: business } = useBusiness();
  const updateBusiness = useUpdateBusiness();

  const [activeKey, setActiveKey] = useState(TEMPLATE_FIELDS[0]?.key ?? 'stamp_issued');
  const [templates, setTemplates] = useState<Record<string, string>>(() => ({
    ...DEFAULT_BODIES,
    ...(business?.message_templates ?? {}),
  }));

  const activeField = TEMPLATE_FIELDS.find((f) => f.key === activeKey)!;
  const body     = templates[activeKey] ?? DEFAULT_BODIES[activeKey] ?? '';
  const ctaValue = activeField.ctaKey
    ? (templates[activeField.ctaKey] ?? activeField.defaultCta ?? '')
    : undefined;

  function handleSave() {
    updateBusiness.mutate(
      { messageTemplates: templates } as Parameters<typeof updateBusiness.mutate>[0],
      {
        onSuccess: () => toast.success('Gespeichert'),
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <div className="flex gap-6 max-w-4xl">
      <nav className="w-52 shrink-0 space-y-1">
        {TEMPLATE_FIELDS.map((f) => (
          <button
            key={f.key} onClick={() => setActiveKey(f.key)}
            className={cn(
              'w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
              activeKey === f.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {f.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 min-w-0 space-y-5">
        <div>
          <h2 className="font-semibold">{activeField.label}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{activeField.hint}</p>
          {activeField.variables.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {activeField.variables.map((v) => (
                <span key={v} className="rounded-full bg-muted border px-2 py-0.5 text-xs font-mono text-muted-foreground">{v}</span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-5 items-start">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nachrichtentext</label>
              <textarea
                rows={6} value={body}
                onChange={(e) => setTemplates((prev) => ({ ...prev, [activeKey]: e.target.value }))}
                className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
              <button
                type="button"
                onClick={() => setTemplates((prev) => ({ ...prev, [activeKey]: DEFAULT_BODIES[activeKey] ?? '' }))}
                className="mt-1 text-xs text-muted-foreground hover:text-foreground underline"
              >
                Zurücksetzen
              </button>
            </div>

            {activeField.ctaKey !== undefined && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Button-Text (CTA)</label>
                <input
                  value={ctaValue ?? ''}
                  onChange={(e) => setTemplates((prev) => ({ ...prev, [activeField.ctaKey!]: e.target.value }))}
                  placeholder={activeField.defaultCta}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p className="mt-1 text-xs text-muted-foreground">Standard: „{activeField.defaultCta}"</p>
              </div>
            )}

            <button
              onClick={handleSave} disabled={updateBusiness.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {updateBusiness.isPending ? 'Wird gespeichert…' : 'Speichern'}
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Vorschau</p>
            <WaBubble body={body} {...(ctaValue ? { ctaLabel: ctaValue } : {})} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Hauptseite ────────────────────────────────────────────────────────────────

export function ProgramPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(tabParam ?? 'treuekarte');

  function switchTab(id: Tab) {
    setActiveTab(id);
    setSearchParams(id === 'treuekarte' ? {} : { tab: id });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Programm</h1>

      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map(({ id, label }) => (
          <button
            key={id} onClick={() => switchTab(id)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              activeTab === id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'treuekarte'       && <TreuekartTab />}
      {activeTab === 'erscheinungsbild' && <ErscheinungsbildTab />}
      {activeTab === 'nachrichten'      && <NachrichtenTab />}
      {activeTab === 'qrcode'           && <QrCodeTab />}
    </div>
  );
}
