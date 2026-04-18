import { useState } from 'react';
import { toast } from 'sonner';
import { useBusiness, useUpdateBusiness } from '@/hooks/useBusiness';

export function AppearancePage() {
  const { data: business } = useBusiness();
  const updateBusiness = useUpdateBusiness();
  const [primaryColor, setPrimaryColor] = useState(business?.primary_color ?? '#25D366');
  const [rewardDesc, setRewardDesc] = useState(business?.reward_description ?? '');
  const [stampsPerReward, setStampsPerReward] = useState(business?.stamps_per_reward ?? 10);

  function handleSave() {
    updateBusiness.mutate(
      { primaryColor, rewardDescription: rewardDesc, stampsPerReward } as Parameters<typeof updateBusiness.mutate>[0],
      {
        onSuccess: () => toast.success('Einstellungen gespeichert'),
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold">Karteneinstellungen & Erscheinungsbild</h1>

      <div className="rounded-xl border bg-card p-5 space-y-5">
        <div>
          <label className="text-sm font-medium">Primärfarbe</label>
          <div className="mt-2 flex items-center gap-3">
            <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-16 cursor-pointer rounded border" />
            <span className="text-sm text-muted-foreground font-mono">{primaryColor}</span>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Stempel pro Belohnung</label>
          <input
            type="number" min="1" max="100"
            value={stampsPerReward}
            onChange={(e) => setStampsPerReward(parseInt(e.target.value))}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Belohnungsbeschreibung</label>
          <input
            value={rewardDesc}
            onChange={(e) => setRewardDesc(e.target.value)}
            placeholder="z.B. Gratis Getränk"
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={updateBusiness.isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {updateBusiness.isPending ? 'Wird gespeichert…' : 'Speichern'}
        </button>
      </div>
    </div>
  );
}
