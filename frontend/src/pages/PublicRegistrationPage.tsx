import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

const BASE = `${(import.meta.env['VITE_API_URL'] as string | undefined) ?? ''}/api/v1/public`;

interface BusinessBranding {
  businessName: string;
  logoUrl: string | null;
  primaryColor: string;
  stampsPerReward: number;
  rewardDescription: string;
}

export function PublicRegistrationPage() {
  const { slug } = useParams<{ slug: string }>();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [success, setSuccess] = useState(false);

  const { data: branding, isLoading } = useQuery({
    queryKey: ['public', slug],
    queryFn: () =>
      fetch(`${BASE}/${slug}/register`).then((r) => r.json()).then((r) => r.data as BusinessBranding),
    enabled: !!slug,
  });

  const register = useMutation({
    mutationFn: () =>
      fetch(`${BASE}/${slug}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: name, phone, consentGiven: consent }),
      }).then((r) => r.json()),
    onSuccess: () => setSuccess(true),
    onError: () => toast.error('Registrierung fehlgeschlagen'),
  });

  if (isLoading) return <div className="flex min-h-screen items-center justify-center">Wird geladen…</div>;

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-sm rounded-xl border bg-card p-8 text-center space-y-4">
          <div className="text-5xl">🎉</div>
          <h1 className="text-xl font-bold">Willkommen bei {branding?.businessName}!</h1>
          <p className="text-sm text-muted-foreground">
            Sammle {branding?.stampsPerReward} Stempel und erhalte: {branding?.rewardDescription}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 space-y-5">
        <div className="text-center">
          <h1 className="text-xl font-bold">{branding?.businessName ?? 'Treueprogramm'}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Jetzt unserem Treueprogramm beitreten</p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); register.mutate(); }}
          className="space-y-4"
        >
          <div>
            <label className="text-sm font-medium">Dein Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Max Mustermann"
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div>
            <label className="text-sm font-medium">WhatsApp-Nummer</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="+4915123456789"
              type="tel"
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
              className="mt-0.5"
            />
            <span className="text-muted-foreground">
              Ich stimme zu, dass meine Daten für das Treueprogramm verwendet werden (DSGVO-konform).
            </span>
          </label>
          <button
            type="submit"
            disabled={register.isPending || !consent}
            className="w-full rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {register.isPending ? 'Wird registriert…' : 'Treueprogramm beitreten'}
          </button>
        </form>
      </div>
    </div>
  );
}
