import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

const BASE = '/api/v1/public';

interface RewardStage { stamp: number; description: string }

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
  };
  vouchers: Array<{
    code: string;
    description: string;
    issued_at: string;
    expires_at: string | null;
  }>;
}

function StampDot({
  filled,
  isNew,
  isReward,
  index,
  color,
}: {
  filled: boolean;
  isNew: boolean;
  isReward: boolean;
  index: number;
  color: string;
}) {
  return (
    <div
      style={{
        width: 52,
        height: 52,
        borderRadius: '50%',
        background: filled
          ? isReward ? '#f59e0b' : color
          : 'transparent',
        border: filled
          ? 'none'
          : isReward
          ? `2.5px dashed #f59e0b88`
          : `2.5px solid ${color}40`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s ease',
        animation: isNew
          ? 'stampIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
          : filled
          ? `fadeStamp 0.4s ease ${index * 60}ms both`
          : undefined,
        opacity: filled ? 1 : isReward ? 0.55 : 0.35,
        boxShadow: filled
          ? isReward
            ? '0 4px 12px rgba(245,158,11,0.45)'
            : `0 4px 12px ${color}55`
          : 'none',
        fontSize: 20,
      }}
    >
      {filled ? (
        isReward ? (
          '🎁'
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 13l4 4L19 7"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )
      ) : isReward ? (
        <span style={{ opacity: 0.6, fontSize: 18 }}>🎁</span>
      ) : null}
    </div>
  );
}

function VoucherCard({
  voucher,
  color,
}: {
  voucher: WalletData['vouchers'][0];
  color: string;
}) {
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(voucher.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      style={{
        background: 'white',
        borderRadius: 16,
        padding: '16px',
        marginBottom: 12,
        boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
        border: `1px solid ${color}22`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: `${color}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            flexShrink: 0,
          }}
        >
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
      <div
        style={{
          margin: '14px -16px',
          borderTop: '2px dashed #f0f0f0',
          position: 'relative',
        }}
      >
        <div style={{
          position: 'absolute', left: -8, top: -8,
          width: 16, height: 16, borderRadius: '50%', background: '#f5f5f5',
        }} />
        <div style={{
          position: 'absolute', right: -8, top: -8,
          width: 16, height: 16, borderRadius: '50%', background: '#f5f5f5',
        }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1 }}>
            Gutscheincode
          </p>
          <p style={{ margin: '2px 0 0', fontWeight: 800, fontSize: 20, letterSpacing: 3, color: '#1a1a1a' }}>
            {voucher.code}
          </p>
        </div>
        <button
          onClick={copyCode}
          style={{
            background: copied ? '#22c55e' : color,
            color: 'white',
            border: 'none',
            borderRadius: 10,
            padding: '8px 16px',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {copied ? '✓ Kopiert' : 'Einlösen'}
        </button>
      </div>
    </div>
  );
}

// useState needs to be imported — extracted here to avoid hoisting issues
import { useState } from 'react';

export function CustomerWalletPage() {
  const { slug, token } = useParams<{ slug: string; token: string }>();
  const [searchParams] = useSearchParams();
  const isNew = searchParams.get('new') === '1';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['wallet', slug, token],
    queryFn: () =>
      fetch(`${BASE}/${slug}/wallet/${token}`)
        .then((r) => r.json())
        .then((r) => r.data as WalletData),
    enabled: !!slug && !!token,
  });

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
  // Prefer new stamp_count field; fall back to stampsPerReward for older API responses
  const totalSlots = business.stampCount ?? business.stampsPerReward;
  const rewardStages: RewardStage[] = business.rewardStages ?? [
    { stamp: totalSlots, description: business.rewardDescription },
  ];
  const rewardPositions = new Set(rewardStages.map((s) => s.stamp));
  const filled = customer.totalStamps;

  // Find the next reward the customer is working toward
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
          padding: '48px 24px 32px',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ position: 'absolute', top: 20, right: 20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />

          {business.logoUrl ? (
            <img src={business.logoUrl} alt={business.name} style={{ width: 52, height: 52, borderRadius: 14, marginBottom: 12, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)' }} />
          ) : (
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 12, fontWeight: 700 }}>
              {business.name.charAt(0)}
            </div>
          )}

          <p style={{ margin: '0 0 2px', fontSize: 13, opacity: 0.8, fontWeight: 500 }}>
            {business.name}
          </p>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>
            {customer.displayName ? `Hallo, ${customer.displayName.split(' ')[0]}! 👋` : 'Deine Stempelkarte'}
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, opacity: 0.75 }}>
            {customer.lifetimeStamps} Stempel insgesamt gesammelt
          </p>
        </div>

        <div style={{ padding: '20px 16px', animation: 'slideUp 0.4s ease both' }}>

          {/* Stamp card */}
          <div style={{
            background: 'white',
            borderRadius: 20,
            padding: '20px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            marginBottom: 20,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: '#1a1a1a' }}>Treuekarte</p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#888' }}>
                  {filled} von {totalSlots} Stempeln
                </p>
              </div>
              <div style={{
                background: '#fef3c720',
                borderRadius: 10,
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: 600,
                color: '#b45309',
                border: '1px solid #fcd34d',
              }}>
                🎁 {rewardStages.length} Belohnungen
              </div>
            </div>

            {/* Stamp grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(5, totalSlots)}, 1fr)`,
              gap: 8,
              justifyItems: 'center',
            }}>
              {Array.from({ length: totalSlots }, (_, i) => i + 1).map((pos) => (
                <StampDot
                  key={pos}
                  index={pos}
                  filled={pos <= filled}
                  isNew={isNew && pos === filled}
                  isReward={rewardPositions.has(pos)}
                  color={color}
                />
              ))}
            </div>

            {/* Progress bar */}
            <div style={{ marginTop: 16 }}>
              <div style={{ height: 6, background: '#f0f0f0', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${(filled / totalSlots) * 100}%`,
                  background: `linear-gradient(90deg, ${color}, ${color}99)`,
                  borderRadius: 99,
                  transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }} />
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#aaa', textAlign: 'center' }}>
                {nextReward
                  ? `Noch ${nextReward.stamp - filled} Stempel bis: ${nextReward.description}`
                  : '🎉 Alle Belohnungen verdient!'}
              </p>
            </div>
          </div>

          {/* Vouchers */}
          {vouchers.length > 0 && (
            <div>
              <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 16, color: '#1a1a1a' }}>
                🎟 Deine Gutscheine
              </p>
              {vouchers.map((v) => (
                <VoucherCard key={v.code} voucher={v} color={color} />
              ))}
            </div>
          )}

          {vouchers.length === 0 && (
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: 24,
              textAlign: 'center',
              boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            }}>
              <p style={{ fontSize: 32, margin: '0 0 8px' }}>🎯</p>
              <p style={{ margin: 0, fontWeight: 600, color: '#1a1a1a' }}>Noch keine Gutscheine</p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#aaa' }}>
                {nextReward
                  ? `Noch ${nextReward.stamp - filled} Stempel bis: ${nextReward.description}`
                  : 'Sammle weitere Stempel für neue Belohnungen!'}
              </p>
            </div>
          )}

          {/* Footer */}
          <p style={{ textAlign: 'center', fontSize: 11, color: '#ccc', marginTop: 32, marginBottom: 16 }}>
            {business.name} · Stempelkarte
          </p>
        </div>
      </div>
    </>
  );
}
