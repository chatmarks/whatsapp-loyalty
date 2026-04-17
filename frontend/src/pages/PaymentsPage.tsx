import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface SubscriptionData { plan: string; subscriptionId: string | null }

export function PaymentsPage() {
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
    mutationFn: () => api.post<{ data: { url: string } }>('/payments/portal', {}).then((r) => r.data),
    onSuccess: ({ url }) => { if (url) window.location.href = url; },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold">Abonnement</h1>

      <div className="rounded-xl border bg-card p-5">
        <p className="text-sm font-medium text-muted-foreground">Aktueller Plan</p>
        <p className="mt-1 text-2xl font-bold capitalize">{data?.plan ?? '—'}</p>
        {data?.subscriptionId && (
          <button onClick={() => portal.mutate()} disabled={portal.isPending} className="mt-3 rounded-md border px-4 py-2 text-sm hover:bg-accent disabled:opacity-50">
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
