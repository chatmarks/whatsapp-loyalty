import { useEffect } from 'react';
import { Check, X, User } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  usePendingStampRequests,
  useApproveStampRequest,
  useDeclineStampRequest,
} from '@/hooks/useStampRequests';
import type { PendingStampRequest } from '@/hooks/useStampRequests';

// ── Stamp dot grid ────────────────────────────────────────────────────────────

function StampDots({
  current,
  total,
  color,
  rewardStages,
}: {
  current: number;
  total: number;
  color: string;
  rewardStages: PendingStampRequest['reward_stages'];
}) {
  const COLS = Math.min(5, total);
  const rewardSet = new Set(rewardStages.map((s) => s.stamp));
  const AMBER = '#f59e0b';

  return (
    <div
      style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
      className="grid gap-2 justify-items-center"
    >
      {Array.from({ length: total }, (_, i) => i + 1).map((pos) => {
        const filled   = pos <= current;
        const isReward = rewardSet.has(pos);
        const bg       = isReward ? AMBER : color;
        const stage    = rewardStages.find((s) => s.stamp === pos);
        const emoji    = stage?.emoji;

        return (
          <div
            key={pos}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: filled ? bg : 'transparent',
              border: filled
                ? 'none'
                : isReward
                ? `2px dashed ${AMBER}88`
                : `2px solid ${color}40`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: filled ? `0 3px 10px ${bg}55` : 'none',
              opacity: filled ? 1 : isReward ? 0.55 : 0.35,
              fontSize: 18,
              transition: 'all 0.2s',
            }}
          >
            {filled ? (
              isReward && emoji ? (
                <span>{emoji}</span>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )
            ) : isReward && emoji ? (
              <span style={{ opacity: 0.5 }}>{emoji}</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export function StampApprovalModal() {
  const { data: requests } = usePendingStampRequests();
  const approve = useApproveStampRequest();
  const decline = useDeclineStampRequest();

  // Show the oldest pending request first
  const request = requests?.[0];

  // Keyboard shortcut: Enter = approve, Escape = decline
  useEffect(() => {
    if (!request) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter' && !approve.isPending && !decline.isPending) handleApprove();
      if (e.key === 'Escape' && !decline.isPending && !approve.isPending) handleDecline();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.id, approve.isPending, decline.isPending]);

  if (!request) return null;

  const name = request.display_name ?? request.wa_contact_name ?? request.phone_display;
  const color = request.primary_color;

  function handleApprove() {
    approve.mutate(request!.id, {
      onSuccess: () => toast.success(`Stempel für ${name} vergeben ✓`),
      onError: () => toast.error('Fehler beim Vergeben des Stempels'),
    });
  }

  function handleDecline() {
    decline.mutate(request!.id, {
      onSuccess: () => toast('Anfrage abgelehnt'),
      onError: () => toast.error('Fehler beim Ablehnen'),
    });
  }

  const isPending = approve.isPending || decline.isPending;

  return (
    <>
      {/* Blurred backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-md rounded-2xl bg-card shadow-2xl overflow-hidden">

          {/* Header strip in primary color */}
          <div
            className="px-6 pt-6 pb-5 text-white"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
          >
            <p className="text-sm font-medium opacity-80 mb-1">Stempel-Anfrage</p>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/25">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold leading-tight">{name}</h2>
                <p className="text-sm opacity-75">{request.phone_display}</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5">
            {/* Stamp count badge */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Aktuelle Stempel</span>
              <span className="rounded-full bg-muted px-3 py-1 text-sm font-bold">
                {request.total_stamps} / {request.stamp_count}
              </span>
            </div>

            {/* Stamp grid */}
            <StampDots
              current={request.total_stamps}
              total={request.stamp_count}
              color={color}
              rewardStages={request.reward_stages}
            />

            {/* After-approval preview text */}
            <p className="text-center text-xs text-muted-foreground">
              Nach Bestätigung: <span className="font-semibold">{request.total_stamps + 1}/{request.stamp_count}</span>
              {' '}· Kunde erhält WhatsApp-Benachrichtigung
            </p>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 divide-x border-t">
            <button
              onClick={handleDecline}
              disabled={isPending}
              className={cn(
                'flex items-center justify-center gap-2.5 py-4 text-base font-semibold transition-colors',
                'text-muted-foreground hover:bg-muted/60 disabled:opacity-50',
              )}
            >
              <X className="h-5 w-5" />
              Ablehnen
            </button>
            <button
              onClick={handleApprove}
              disabled={isPending}
              className={cn(
                'flex items-center justify-center gap-2.5 py-4 text-base font-bold transition-colors',
                'text-white disabled:opacity-60',
              )}
              style={{ background: isPending ? `${color}99` : color }}
            >
              <Check className="h-5 w-5" strokeWidth={3} />
              {approve.isPending ? 'Vergebe…' : 'Stempel geben'}
            </button>
          </div>

          {/* Queue indicator */}
          {(requests?.length ?? 0) > 1 && (
            <div className="border-t bg-muted/40 px-4 py-2 text-center text-xs text-muted-foreground">
              {(requests?.length ?? 0) - 1} weitere Anfrage{(requests?.length ?? 0) > 2 ? 'n' : ''} in der Warteschlange
            </div>
          )}
        </div>
      </div>
    </>
  );
}
