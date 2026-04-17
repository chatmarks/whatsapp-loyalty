import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface Summary { revenue: number; orderCount: number; stamps: number; redemptions: number }

export function ReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'summary'],
    queryFn: () => api.get<{ data: Summary }>('/reports/summary').then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Berichte</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Umsatz', value: isLoading ? '…' : formatCurrency(data?.revenue ?? 0) },
          { label: 'Bestellungen', value: isLoading ? '…' : (data?.orderCount ?? 0) },
          { label: 'Stempel', value: isLoading ? '…' : (data?.stamps ?? 0) },
          { label: 'Einlösungen', value: isLoading ? '…' : (data?.redemptions ?? 0) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border bg-card p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
        Diagramme mit Recharts — <code>BarChart</code>-Komponenten hier mit den Endpunkten <code>/reports/customers</code> und <code>/reports/products</code> hinzufügen.
      </div>
    </div>
  );
}
