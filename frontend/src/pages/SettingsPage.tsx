import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useBusiness, useUpdateBusiness } from '@/hooks/useBusiness';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { CheckCircle2, Wifi, WifiOff } from 'lucide-react';

type Tab = 'allgemein' | 'erscheinungsbild' | 'whatsapp' | 'nachrichten' | 'qrcode' | 'abonnement';

const TABS: { id: Tab; label: string }[] = [
  { id: 'allgemein',        label: 'Allgemein' },
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

// ── WhatsApp Embedded Signup ──────────────────────────────────────────────────

declare global {
  interface Window {
    FB?: {
      init: (opts: object) => void;
      login: (cb: (res: { authResponse?: unknown }) => void, opts: object) => void;
    };
    fbAsyncInit?: () => void;
  }
}

interface EmbeddedSignupResult {
  phone_number_id: string;
  waba_id: string;
}

function WhatsAppTab() {
  const { data: business } = useBusiness();
  const [sdkReady, setSdkReady] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const save = useMutation({
    mutationFn: (payload: { waPhoneNumberId: string; waAccessToken: string; waPhoneNumber?: string }) =>
      api.patch('/businesses/me/whatsapp', payload),
    onSuccess: () => toast.success('WhatsApp erfolgreich verbunden!'),
    onError: (e) => toast.error(e.message),
  });

  // Load Meta FB.js SDK once
  useEffect(() => {
    const META_APP_ID = (import.meta.env['VITE_META_APP_ID'] as string | undefined) ?? '';
    if (!META_APP_ID) return; // No app ID configured — skip SDK load

    if (window.FB) { setSdkReady(true); return; }

    window.fbAsyncInit = () => {
      window.FB?.init({
        appId: META_APP_ID,
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v20.0',
      });
      setSdkReady(true);
    };

    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup is intentionally omitted — FB SDK is global and should stay loaded
    };
  }, []);

  // Listen for the Embedded Signup callback message from Meta's popup
  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      if (ev.origin !== 'https://www.facebook.com') return;
      try {
        const data = typeof ev.data === 'string' ? JSON.parse(ev.data) as Record<string, unknown> : ev.data as Record<string, unknown>;
        if (data['type'] !== 'WA_EMBEDDED_SIGNUP') return;

        const result = data['data'] as EmbeddedSignupResult | undefined;
        if (!result?.phone_number_id) return;

        // Meta's embedded signup provides the phone_number_id and waba_id.
        // The access token is obtained separately via System User token —
        // for now we store the phone_number_id and prompt for token.
        setConnecting(false);
        toast.success(`Verbunden! Phone ID: ${result.phone_number_id}`);

        // Persist phone_number_id — token must be set via System User in Meta Business Manager
        // wa_phone_number must be entered manually in the settings field below
        save.mutate({ waPhoneNumberId: result.phone_number_id, waAccessToken: '' });
      } catch { /* ignore non-JSON messages */ }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [save]);

  function handleEmbeddedSignup() {
    if (!window.FB) { toast.error('Meta SDK nicht geladen'); return; }
    setConnecting(true);
    window.FB.login(
      (res) => {
        if (!res.authResponse) {
          setConnecting(false);
          toast.error('Verbindung abgebrochen');
        }
        // The WA_EMBEDDED_SIGNUP message event carries the actual phone_number_id
      },
      {
        scope: 'whatsapp_business_management,whatsapp_business_messaging',
        extras: {
          feature: 'whatsapp_embedded_signup',
          setup: {},
        },
      },
    );
  }

  const isConnected = !!business?.wa_phone_number_id;
  const META_APP_ID = (import.meta.env['VITE_META_APP_ID'] as string | undefined) ?? '';

  return (
    <div className="space-y-5 max-w-lg">
      {/* Connection status card */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-semibold text-sm">WhatsApp Business</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Verbinde dein WhatsApp Business-Konto, um Stempel-Benachrichtigungen zu senden.
            </p>
          </div>
          {isConnected ? (
            <span className="flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs font-medium text-green-700">
              <Wifi className="h-3 w-3" />
              Verbunden
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full bg-muted border px-3 py-1 text-xs font-medium text-muted-foreground">
              <WifiOff className="h-3 w-3" />
              Nicht verbunden
            </span>
          )}
        </div>

        {isConnected && (
          <div className="rounded-lg bg-muted/60 border p-3 space-y-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Phone Number ID (Meta)</p>
              <p className="text-sm font-mono">{business.wa_phone_number_id}</p>
            </div>
            {business.wa_phone_number && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">WhatsApp-Nummer</p>
                <p className="text-sm font-mono">+{business.wa_phone_number}</p>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              <span className="text-xs text-green-700">Aktiv</span>
            </div>
          </div>
        )}
      </div>

      {/* Embedded signup button — only if Meta App ID is configured */}
      {META_APP_ID ? (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold">
            {isConnected ? 'Konto wechseln' : 'Mit WhatsApp verbinden'}
          </h3>
          <p className="text-xs text-muted-foreground">
            Klicke auf den Button, um dein WhatsApp Business-Konto über Meta direkt zu verknüpfen.
            Du wirst durch den offiziellen Meta-Einrichtungsprozess geführt.
          </p>
          <button
            onClick={handleEmbeddedSignup}
            disabled={!sdkReady || connecting || save.isPending}
            className="flex items-center gap-2.5 rounded-md px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-colors"
            style={{ backgroundColor: '#1877F2' }}
          >
            {/* Meta's official Facebook logo mark */}
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white" aria-hidden="true">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            {connecting ? 'Verbinde…' : isConnected ? 'Konto neu verknüpfen' : 'Mit Facebook anmelden'}
          </button>
        </div>
      ) : (
        /* Fallback: manual config when no Meta App ID is set (dev/self-hosted) */
        <ManualWhatsAppForm />
      )}
    </div>
  );
}

function ManualWhatsAppForm() {
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [phoneNumber, setPhoneNumber]     = useState('');
  const [accessToken, setAccessToken]     = useState('');

  const save = useMutation({
    mutationFn: () =>
      api.patch('/businesses/me/whatsapp', {
        waPhoneNumberId: phoneNumberId,
        waAccessToken: accessToken,
        ...(phoneNumber ? { waPhoneNumber: phoneNumber } : {}),
      }),
    onSuccess: () => toast.success('WhatsApp-Einstellungen gespeichert'),
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Manuelle Konfiguration</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Nutze einen permanenten System-User-Token aus dem Meta Business Manager.
          Token wird verschlüsselt gespeichert und nie im Klartext zurückgegeben.
        </p>
      </div>
      <div>
        <label className="text-sm font-medium">Phone Number ID <span className="text-muted-foreground font-normal">(Meta intern)</span></label>
        <input
          value={phoneNumberId}
          onChange={(e) => setPhoneNumberId(e.target.value)}
          placeholder="1234567890123456"
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div>
        <label className="text-sm font-medium">WhatsApp-Nummer <span className="text-muted-foreground font-normal">(für QR-Code)</span></label>
        <input
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
          placeholder="4915123456789"
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="mt-1 text-xs text-muted-foreground">Nur Ziffern, ohne +. Wird in wa.me-Links verwendet.</p>
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

interface TemplateField {
  key: string;
  label: string;
  hint: string;
  variables: string[];
  /** Optional CTA button key in message_templates */
  ctaKey?: string;
  defaultCta?: string;
}

const TEMPLATE_FIELDS: TemplateField[] = [
  {
    key: 'stamp_issued',
    label: 'Stempel erhalten',
    hint: 'Benachrichtigung nach jeder Stempel-Vergabe.',
    variables: ['{count}', '{total}', '{stampCount}', '{remaining}'],
    ctaKey: 'stamp_issued_cta',
    defaultCta: 'Stempelkarte öffnen',
  },
  {
    key: 'reward_earned',
    label: 'Belohnung erhalten',
    hint: 'Wird gesendet, wenn ein Reward-Schwellenwert erreicht wird.',
    variables: ['{description}', '{code}'],
    ctaKey: 'reward_earned_cta',
    defaultCta: 'Gutschein ansehen',
  },
  {
    key: 'not_registered',
    label: 'Nicht registriert',
    hint: 'Wenn ein unbekannter Kontakt ein Keyword schreibt.',
    variables: [],
    ctaKey: 'not_registered_cta',
    defaultCta: 'Jetzt registrieren',
  },
  {
    key: 'stamp_cooldown',
    label: 'Cooldown-Hinweis',
    hint: 'Bei zu frühem Keyword-Stempel (8h-Sperre).',
    variables: ['{hours}'],
  },
  {
    key: 'opt_out_confirm',
    label: 'Abmeldung bestätigt',
    hint: 'Bestätigung nach Opt-out. Keine Variablen.',
    variables: [],
  },
  {
    key: 'opt_in_welcome',
    label: 'Willkommensnachricht',
    hint: 'Nach erfolgreicher Registrierung gesendet.',
    variables: ['{name}', '{businessName}'],
  },
];

const DEFAULT_BODIES: Record<string, string> = {
  not_registered: 'Du bist noch nicht registriert. Melde dich hier an und sammle Stempel! 🎉',
  stamp_cooldown: 'Du hast heute bereits einen Stempel erhalten. ⏳\n\nDer nächste ist in ca. {hours} Stunde(n) verfügbar.',
  stamp_issued: 'Du hast {count} Stempel erhalten! 🎉\n\n📍 Aktueller Stand: {total}/{stampCount} Stempel\nNoch {remaining} bis zu deiner Belohnung.',
  reward_earned: '🎉 Glückwunsch! Du hast deine Belohnung verdient!\n\n🎁 {description}\nDein Code: *{code}*\n\nZeige diesen Code beim nächsten Besuch vor.',
  opt_out_confirm: 'Du wurdest erfolgreich vom Treueprogramm abgemeldet. Auf Wiedersehen! 👋',
  opt_in_welcome: 'Willkommen bei {businessName}, {name}! 🎉\n\nDu bist jetzt Teil unseres Treueprogramms. Schreibe "Stempel" nach deinem nächsten Besuch, um deinen ersten Stempel zu sammeln!',
};

// Replace template variables with example values for preview
const PREVIEW_VARS: Record<string, string> = {
  '{count}': '1',
  '{total}': '5',
  '{stampCount}': '10',
  '{remaining}': '5',
  '{hours}': '6',
  '{description}': 'Gratis Kaffee',
  '{code}': 'ABC-123',
  '{name}': 'Max',
  '{businessName}': 'Café Muster',
};

function applyPreviewVars(text: string): string {
  return Object.entries(PREVIEW_VARS).reduce((t, [k, v]) => t.replaceAll(k, v), text);
}

/** WhatsApp-style message bubble for preview */
function WaBubble({ body, ctaLabel }: { body: string; ctaLabel?: string | undefined }) {
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
  const body = templates[activeKey] ?? DEFAULT_BODIES[activeKey] ?? '';
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
      {/* Left sidebar — template list */}
      <nav className="w-52 shrink-0 space-y-1">
        {TEMPLATE_FIELDS.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveKey(f.key)}
            className={cn(
              'w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
              activeKey === f.key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {f.label}
          </button>
        ))}
      </nav>

      {/* Right panel */}
      <div className="flex-1 min-w-0 space-y-5">
        <div>
          <h2 className="font-semibold">{activeField.label}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{activeField.hint}</p>
          {activeField.variables.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {activeField.variables.map((v) => (
                <span key={v} className="rounded-full bg-muted border px-2 py-0.5 text-xs font-mono text-muted-foreground">
                  {v}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-5 items-start">
          {/* Editor */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nachrichtentext</label>
              <textarea
                rows={6}
                value={body}
                onChange={(e) =>
                  setTemplates((prev) => ({ ...prev, [activeKey]: e.target.value }))
                }
                className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
              <button
                type="button"
                onClick={() =>
                  setTemplates((prev) => ({ ...prev, [activeKey]: DEFAULT_BODIES[activeKey] ?? '' }))
                }
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
                  onChange={(e) =>
                    setTemplates((prev) => ({
                      ...prev,
                      [activeField.ctaKey!]: e.target.value,
                    }))
                  }
                  placeholder={activeField.defaultCta}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Standard: „{activeField.defaultCta}"
                </p>
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={updateBusiness.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {updateBusiness.isPending ? 'Wird gespeichert…' : 'Speichern'}
            </button>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Vorschau</p>
            <WaBubble
              body={body}
              {...(ctaValue ? { ctaLabel: ctaValue } : {})}
            />
          </div>
        </div>
      </div>
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
      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => switchTab(id)}
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

      {/* Tab-Inhalt */}
      {activeTab === 'allgemein'        && <AllgemeinTab />}
      {activeTab === 'erscheinungsbild' && <ErscheinungsbildTab />}
      {activeTab === 'whatsapp'         && <WhatsAppTab />}
      {activeTab === 'nachrichten'      && <NachrichtenTab />}
      {activeTab === 'qrcode'           && <QrCodeTab />}
      {activeTab === 'abonnement'       && <AbonnementTab />}
    </div>
  );
}
