/**
 * QR Redirect Page — /r/:slug
 *
 * Scanned by customers. Checks localStorage for a known wallet token to
 * determine if the customer has already registered for this business:
 *
 *   - Known (token in localStorage) → WA deep-link with "Stempel" message
 *   - Unknown (no token) → WA deep-link with "Anmelden" message
 *     - If ?ref={code} is present (referral link), the code is embedded in
 *       the message so the backend can detect it: "Anmelden REF:{code}"
 *
 * The wallet page stores the token in localStorage under wl_{slug} so future
 * QR scans automatically use the stamp message.
 */

import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

const BASE = `${(import.meta.env['VITE_API_URL'] as string | undefined) ?? ''}/api/v1/public`;

interface BusinessInfo {
  businessName: string;
  logoUrl: string | null;
  primaryColor: string;
  waPhoneNumber: string | null; // actual number for wa.me, e.g. "4915123456789"
}

const WALLET_TOKEN_KEY = (slug: string) => `wl_${slug}`;
const STAMP_MSG        = 'Stempel';
const OPT_IN_MSG       = 'Anmelden';

export function QrRedirectPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref') ?? null;

  const { data, isError } = useQuery({
    queryKey: ['qr-redirect', slug],
    queryFn: () =>
      fetch(`${BASE}/${slug}/register`)
        .then((r) => r.json())
        .then((r) => r.data as BusinessInfo),
    enabled: !!slug,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!data?.waPhoneNumber) return;

    const knownToken = slug ? localStorage.getItem(WALLET_TOKEN_KEY(slug)) : null;
    const isKnown    = !!knownToken;

    // Build the pre-filled WhatsApp message
    let message: string;
    if (isKnown) {
      message = STAMP_MSG;
    } else if (refCode) {
      // Embed referral code so the backend can associate this registration
      message = `${OPT_IN_MSG} REF:${refCode}`;
    } else {
      message = OPT_IN_MSG;
    }

    const waUrl = `https://wa.me/${data.waPhoneNumber}?text=${encodeURIComponent(message)}`;
    window.location.replace(waUrl);
  }, [data, slug, refCode]);

  const color = data?.primaryColor ?? '#25D366';

  // ── While redirecting ──────────────────────────────────────────────────────

  if (isError) {
    return (
      <div style={styles.center}>
        <span style={{ fontSize: 40 }}>🔗</span>
        <p style={{ fontWeight: 700, fontSize: 18, margin: '8px 0 4px' }}>Link ungültig</p>
        <p style={{ color: '#888', fontSize: 14, margin: 0 }}>
          Bitte frage beim Betreiber nach einem neuen QR-Code.
        </p>
      </div>
    );
  }

  return (
    <div style={{ ...styles.center, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Business logo/avatar */}
      {data?.logoUrl ? (
        <img
          src={data.logoUrl}
          alt={data.businessName}
          style={{ width: 72, height: 72, borderRadius: 18, objectFit: 'cover', marginBottom: 20, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
        />
      ) : (
        <div style={{
          width: 72, height: 72, borderRadius: 18, background: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, fontWeight: 700, color: 'white', marginBottom: 20,
          boxShadow: `0 4px 16px ${color}55`,
        }}>
          {data?.businessName?.charAt(0) ?? '…'}
        </div>
      )}

      <p style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: '#1a1a1a' }}>
        {data?.businessName ?? '…'}
      </p>
      <p style={{ margin: '0 0 32px', fontSize: 14, color: '#888' }}>
        Weiterleitung zu WhatsApp…
      </p>

      {/* Spinner */}
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        border: `3px solid ${color}33`,
        borderTopColor: color,
        animation: 'spin 0.8s linear infinite',
      }} />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        body { margin: 0; background: #f9f9f9; }
      `}</style>
    </div>
  );
}

const styles = {
  center: {
    minHeight: '100svh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f9f9f9',
    padding: 24,
    textAlign: 'center' as const,
  },
};
