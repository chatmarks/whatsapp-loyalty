import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const BASE = `${(import.meta.env['VITE_API_URL'] as string | undefined) ?? ''}/api/v1/public`;

interface RewardStage { stamp: number; description: string; emoji?: string }

interface WalletData {
  business: {
    name: string;
    logoUrl: string | null;
    primaryColor: string;
    stampsPerReward: number;
    rewardDescription: string;
    stampCount: number;
    rewardStages: RewardStage[];
  };
  customer: {
    displayName: string | null;
    totalStamps: number;
    lifetimeStamps: number;
    referralCode: string | null;
    stampSources: string[]; // per filled dot: 'stamp' | 'referral' | ...
  };
  vouchers: Array<{
    code: string;
    description: string;
    issued_at: string;
    expires_at: string | null;
  }>;
}

// ── Stamp dot ─────────────────────────────────────────────────────────────────

function StampDot({
  filled, isNew, isReward, index, color, emoji,
}: {
  filled: boolean; isNew: boolean; isReward: boolean;
  index: number; color: string; emoji?: string;
}) {
  return (
    <div
      style={{
        width: 52, height: 52, borderRadius: '50%',
        background: filled ? (isReward ? '#f59e0b' : color) : 'transparent',
        border: filled ? 'none' : isReward ? `2.5px dashed #f59e0b88` : `2.5px solid ${color}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.3s ease',
        animation: isNew
          ? 'stampIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
          : filled ? `fadeStamp 0.4s ease ${index * 60}ms both` : undefined,
        opacity: filled ? 1 : isReward ? 0.55 : 0.35,
        boxShadow: filled ? (isReward ? '0 4px 12px rgba(245,158,11,0.45)' : `0 4px 12px ${color}55`) : 'none',
        fontSize: 20,
      }}
    >
      {filled ? (
        isReward ? (emoji ?? '🎁') : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )
      ) : isReward ? (
        <span style={{ opacity: 0.6, fontSize: 18 }}>{emoji ?? '🎁'}</span>
      ) : null}
    </div>
  );
}

// ── Swipe to redeem ───────────────────────────────────────────────────────────

const HANDLE = 48;
const THRESHOLD = 0.78;

function SwipeToRedeem({
  onConfirm,
  isPending,
  confirmed,
  color,
}: {
  onConfirm: () => void;
  isPending: boolean;
  confirmed: boolean;
  color: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  const maxX = useCallback((): number => {
    return Math.max(1, (trackRef.current?.offsetWidth ?? 260) - HANDLE - 8);
  }, []);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    setDragX((prev) => Math.max(0, Math.min(maxX(), prev + e.movementX)));
  }

  function onPointerUp() {
    setDragging(false);
    if (dragX / maxX() >= THRESHOLD) {
      onConfirm();
    } else {
      setDragX(0);
    }
  }

  const progress = dragX / Math.max(1, maxX());

  if (confirmed || isPending) {
    return (
      <div style={{
        height: 48, borderRadius: 24, background: confirmed ? '#22c55e22' : '#f0f0f0',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontSize: 13, color: confirmed ? '#16a34a' : '#888', fontWeight: 600,
      }}>
        {confirmed ? '✓ Eingelöst' : '…'}
      </div>
    );
  }

  return (
    <div
      ref={trackRef}
      style={{ position: 'relative', height: 48, borderRadius: 24, background: '#f0f0f0', overflow: 'hidden', userSelect: 'none' }}
    >
      {/* Fill behind handle */}
      <div style={{
        position: 'absolute', left: 0, top: 0,
        width: 4 + dragX + HANDLE,
        height: '100%', background: `${color}22`, borderRadius: 24,
        pointerEvents: 'none',
        transition: dragging ? 'none' : 'width 0.3s',
      }} />

      {/* Label */}
      <span style={{
        position: 'absolute', left: 0, right: 0, top: 0, height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, color: '#999', fontWeight: 500, pointerEvents: 'none',
        opacity: Math.max(0, 1 - progress * 2.5),
      }}>
        Zum Einlösen schieben →
      </span>

      {/* Draggable handle */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: 'absolute',
          left: 4 + dragX, top: 4,
          width: HANDLE, height: HANDLE,
          borderRadius: '50%',
          background: color,
          cursor: dragging ? 'grabbing' : 'grab',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: 18, touchAction: 'none',
          transition: dragging ? 'none' : 'left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: `0 4px 14px ${color}66`,
        }}
      >
        →
      </div>
    </div>
  );
}

// ── Voucher card ──────────────────────────────────────────────────────────────

function VoucherCard({
  voucher,
  color,
  slug,
  token,
}: {
  voucher: WalletData['vouchers'][0];
  color: string;
  slug: string;
  token: string;
}) {
  const queryClient = useQueryClient();
  const [confirmed, setConfirmed] = useState(false);

  const redeem = useMutation({
    mutationFn: () =>
      fetch(`${BASE}/${slug}/wallet/${token}/redeem/${voucher.code}`, { method: 'POST' })
        .then((r) => { if (!r.ok) throw new Error('Fehler'); }),
    onSuccess: () => {
      setConfirmed(true);
      // Remove this voucher from the wallet data after a short delay (so user sees ✓)
      setTimeout(() => {
        queryClient.setQueryData<{ data: WalletData }>(['wallet', slug, token], (old) => {
          if (!old) return old;
          return {
            data: {
              ...old.data,
              vouchers: old.data.vouchers.filter((v) => v.code !== voucher.code),
            },
          };
        });
      }, 1400);
    },
  });

  return (
    <div
      style={{
        background: 'white', borderRadius: 16, padding: '16px 16px 20px',
        marginBottom: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
        border: `1px solid ${color}22`,
        transition: 'opacity 0.4s, transform 0.4s',
        opacity: confirmed ? 0 : 1,
        transform: confirmed ? 'scale(0.96)' : 'scale(1)',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `${color}18`, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 22, flexShrink: 0,
        }}>
          🎁
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#1a1a1a' }}>
            {voucher.description}
          </p>
          {voucher.expires_at && (
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>
              Gültig bis {new Date(voucher.expires_at).toLocaleDateString('de-DE')}
            </p>
          )}
        </div>
      </div>

      {/* Perforated divider */}
      <div style={{ margin: '0 -16px 14px', borderTop: '2px dashed #f0f0f0', position: 'relative' }}>
        <div style={{ position: 'absolute', left: -8, top: -8, width: 16, height: 16, borderRadius: '50%', background: '#f5f5f5' }} />
        <div style={{ position: 'absolute', right: -8, top: -8, width: 16, height: 16, borderRadius: '50%', background: '#f5f5f5' }} />
      </div>

      {/* Code — small, subtle */}
      <p style={{ margin: '0 0 12px', fontSize: 11, color: '#bbb', letterSpacing: 2, textAlign: 'center', fontFamily: 'monospace' }}>
        {voucher.code}
      </p>

      {/* Swipe button */}
      <SwipeToRedeem
        color={color}
        onConfirm={() => redeem.mutate()}
        isPending={redeem.isPending}
        confirmed={confirmed}
      />
    </div>
  );
}

// ── Referral invite card ──────────────────────────────────────────────────────

function ReferralCard({
  referralCode,
  slug,
  businessName,
  color,
}: {
  referralCode: string;
  slug: string;
  businessName: string;
  color: string;
}) {
  const referralUrl = `${window.location.origin}/r/${slug}?ref=${referralCode}`;
  const waShareText = encodeURIComponent(
    `Hej! Ich bin bei ${businessName} Mitglied und du bekommst einen Bonus-Stempel, wenn du dich über meinen Link anmeldest 🎁\n\n${referralUrl}`,
  );

  async function handleNativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${businessName} – Einladung`,
          text: `Werde Mitglied bei ${businessName} und erhalte einen Bonus-Stempel! 🎁`,
          url: referralUrl,
        });
      } catch { /* user cancelled */ }
    } else {
      // Fallback for desktop
      navigator.clipboard.writeText(referralUrl);
    }
  }

  return (
    <div style={{
      background: 'white', borderRadius: 16, padding: 20,
      marginBottom: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
      border: `1px solid ${color}22`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 24 }}>🤝</span>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#1a1a1a' }}>
            Freunde einladen
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>
            Du &amp; dein Freund bekommen je einen Bonus-Stempel
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* WhatsApp CTA */}
        <a
          href={`https://wa.me/?text=${waShareText}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, background: '#25D366', color: 'white', borderRadius: 10,
            padding: '11px 12px', textDecoration: 'none', fontWeight: 600, fontSize: 14,
          }}
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Über WhatsApp einladen
        </a>

        {/* Native share */}
        <button
          onClick={handleNativeShare}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, background: '#f0f0f0', color: '#333', border: 'none',
            borderRadius: 10, padding: '11px 12px', fontWeight: 600, fontSize: 14,
            cursor: 'pointer',
          }}
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
            <polyline points="16 6 12 2 8 6"/>
            <line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
          Einladungslink teilen
        </button>
      </div>
    </div>
  );
}

// ── Main wallet page ──────────────────────────────────────────────────────────

export function CustomerWalletPage() {
  const { slug, token } = useParams<{ slug: string; token: string }>();
  const [searchParams] = useSearchParams();
  const isNew = searchParams.get('new') === '1';

  const { data: raw, isLoading, isError } = useQuery({
    queryKey: ['wallet', slug, token],
    queryFn: () =>
      fetch(`${BASE}/${slug}/wallet/${token}`)
        .then((r) => r.json()) as Promise<{ data: WalletData }>,
    enabled: !!slug && !!token,
  });

  // Persist wallet token in localStorage so QR redirect knows this customer
  useEffect(() => {
    if (slug && token && raw?.data) {
      localStorage.setItem(`wl_${slug}`, token);
    }
  }, [slug, token, raw]);

  const data = raw?.data;

  if (isLoading) {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9f9' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⏳</div>
          <p style={{ color: '#888', fontSize: 14 }}>Wird geladen…</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9f9' }}>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔗</div>
          <p style={{ fontWeight: 700, fontSize: 18, margin: '0 0 8px' }}>Link ungültig</p>
          <p style={{ color: '#888', fontSize: 14, margin: 0 }}>Bitte fordere einen neuen Link an.</p>
        </div>
      </div>
    );
  }

  const { business, customer, vouchers } = data;
  const color = business.primaryColor || '#25D366';
  const totalSlots = business.stampCount ?? business.stampsPerReward;
  const rewardStages: RewardStage[] = business.rewardStages ?? [
    { stamp: totalSlots, description: business.rewardDescription },
  ];
  const rewardPositions = new Set(rewardStages.map((s) => s.stamp));
  const filled = customer.totalStamps;

  const nextReward = rewardStages
    .filter((s) => s.stamp > filled)
    .sort((a, b) => a.stamp - b.stamp)[0];

  return (
    <>
      <style>{`
        @keyframes stampIn {
          0%   { transform: scale(2.2) rotate(-20deg); opacity: 0; }
          60%  { transform: scale(0.88) rotate(4deg);  opacity: 1; }
          80%  { transform: scale(1.06) rotate(-2deg); }
          100% { transform: scale(1)    rotate(0deg);  opacity: 1; }
        }
        @keyframes fadeStamp {
          from { opacity: 0; transform: scale(0.7); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
        body { margin: 0; background: #f5f5f5; }
      `}</style>

      <div style={{ minHeight: '100svh', background: '#f5f5f5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', maxWidth: 420, margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${color}, ${color}cc)`,
          padding: '20px 20px 16px', color: 'white',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {business.logoUrl ? (
              <img src={business.logoUrl} alt={business.name} style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
                {business.name.charAt(0)}
              </div>
            )}
            <div>
              <p style={{ margin: 0, fontSize: 11, opacity: 0.75, fontWeight: 500 }}>{business.name}</p>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>
                {customer.displayName ? `Hallo, ${customer.displayName.split(' ')[0]}! 👋` : 'Deine Stempelkarte'}
              </h1>
            </div>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 12, opacity: 0.7 }}>
            {customer.lifetimeStamps} Stempel insgesamt gesammelt
          </p>
        </div>

        <div style={{ padding: '20px 16px 40px', animation: 'slideUp 0.4s ease both' }}>

          {/* Stamp card */}
          <div style={{ background: 'white', borderRadius: 20, padding: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: '#1a1a1a' }}>Treuekarte</p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#888' }}>{filled} von {totalSlots} Stempeln</p>
              </div>
              <div style={{
                background: '#fef3c720', borderRadius: 10, padding: '4px 10px',
                fontSize: 12, fontWeight: 600, color: '#b45309', border: '1px solid #fcd34d',
              }}>
                🎁 {rewardStages.length} Belohnungen
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(5, totalSlots)}, 1fr)`, gap: 8, justifyItems: 'center' }}>
              {Array.from({ length: totalSlots }, (_, i) => i + 1).map((pos) => {
                const stageForPos = rewardStages.find((s) => s.stamp === pos);
                // stampSources is ordered oldest→newest; pos 1 = index 0
                return (
                  <StampDot
                    key={pos}
                    index={pos}
                    filled={pos <= filled}
                    isNew={isNew && pos === filled}
                    isReward={rewardPositions.has(pos)}
                    color={color}
                    {...(stageForPos?.emoji !== undefined ? { emoji: stageForPos.emoji } : {})}
                  />
                );
              })}
            </div>

            {/* Progress bar */}
            <div style={{ marginTop: 16 }}>
              <div style={{ height: 6, background: '#f0f0f0', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${(filled / totalSlots) * 100}%`,
                  background: `linear-gradient(90deg, ${color}, ${color}99)`,
                  borderRadius: 99, transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }} />
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#aaa', textAlign: 'center' }}>
                {nextReward
                  ? `Noch ${nextReward.stamp - filled} Stempel bis: ${nextReward.description}`
                  : '🎉 Alle Belohnungen verdient!'}
              </p>
            </div>
          </div>

          {/* Active vouchers */}
          {vouchers.length > 0 && (
            <div>
              <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 16, color: '#1a1a1a' }}>
                🎟 Deine Gutscheine
              </p>
              {vouchers.map((v) => (
                <VoucherCard key={v.code} voucher={v} color={color} slug={slug!} token={token!} />
              ))}
            </div>
          )}

          {vouchers.length === 0 && (
            <div style={{ background: 'white', borderRadius: 16, padding: 24, textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', marginBottom: 12 }}>
              <p style={{ fontSize: 32, margin: '0 0 8px' }}>🎯</p>
              <p style={{ margin: 0, fontWeight: 600, color: '#1a1a1a' }}>Noch keine Gutscheine</p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#aaa' }}>
                {nextReward
                  ? `Noch ${nextReward.stamp - filled} Stempel bis: ${nextReward.description}`
                  : 'Sammle weitere Stempel für neue Belohnungen!'}
              </p>
            </div>
          )}

          {/* Referral invite */}
          {customer.referralCode && (
            <ReferralCard
              referralCode={customer.referralCode}
              slug={slug!}
              businessName={business.name}
              color={color}
            />
          )}

          <p style={{ textAlign: 'center', fontSize: 11, color: '#ccc', marginTop: 24, marginBottom: 16 }}>
            {business.name} · Stempelkarte
          </p>
        </div>
      </div>
    </>
  );
}
