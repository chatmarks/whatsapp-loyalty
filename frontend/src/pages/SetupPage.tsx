import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useUpdateBusiness } from '@/hooks/useBusiness';

const STEPS = ['Unternehmensinfo', 'Treueprogramm-Einstellungen', 'WhatsApp'];

export function SetupPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    businessName: '',
    stampsPerReward: 10,
    rewardDescription: 'Gratis Getränk',
    waPhoneNumberId: '',
    waAccessToken: '',
  });
  const updateBusiness = useUpdateBusiness();
  const navigate = useNavigate();

  function handleFinish() {
    updateBusiness.mutate(
      { business_name: form.businessName, stamps_per_reward: form.stampsPerReward, reward_description: form.rewardDescription } as Parameters<typeof updateBusiness.mutate>[0],
      {
        onSuccess: () => { toast.success('Einrichtung abgeschlossen!'); navigate('/'); },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 rounded-xl border bg-card p-8 shadow-sm">
        {/* Progress */}
        <div className="flex gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        <h1 className="text-xl font-bold">{STEPS[step]}</h1>

        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Unternehmensname</label>
              <input
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                placeholder="Mein Café"
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Stempel pro Belohnung</label>
              <input
                type="number" min="1" max="100"
                value={form.stampsPerReward}
                onChange={(e) => setForm({ ...form, stampsPerReward: parseInt(e.target.value) })}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Belohnungsbeschreibung</label>
              <input
                value={form.rewardDescription}
                onChange={(e) => setForm({ ...form, rewardDescription: e.target.value })}
                placeholder="z.B. Gratis Getränk"
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Verbinde deine WhatsApp Business-Nummer über das Meta Developer Portal.</p>
            <div>
              <label className="text-sm font-medium">Telefonnummer-ID</label>
              <input
                value={form.waPhoneNumberId}
                onChange={(e) => setForm({ ...form, waPhoneNumberId: e.target.value })}
                placeholder="1234567890"
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="flex-1 rounded-md border py-2 text-sm hover:bg-accent">
              Zurück
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(step + 1)} className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Weiter
            </button>
          ) : (
            <button onClick={handleFinish} disabled={updateBusiness.isPending} className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {updateBusiness.isPending ? 'Wird gespeichert…' : 'Einrichtung abschließen'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
