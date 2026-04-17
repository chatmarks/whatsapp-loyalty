import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useProducts, useCreateProduct, useDeleteProduct } from '@/hooks/useProducts';
import { formatCurrency } from '@/lib/utils';

export function ProductsPage() {
  const { data: products, isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const deleteProduct = useDeleteProduct();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', price: '', category: 'Sonstiges', taxRate: '19' });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createProduct.mutate(
      {
        name: form.name,
        price: parseFloat(form.price),
        category: form.category,
        tax_rate: parseFloat(form.taxRate),
        description: null,
        image_url: null,
        sort_order: 0,
      } as Parameters<typeof createProduct.mutate>[0],
      {
        onSuccess: () => { toast.success('Produkt erstellt'); setShowForm(false); setForm({ name: '', price: '', category: 'Sonstiges', taxRate: '19' }); },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  const categories = [...new Set((products ?? []).map((p) => p.category))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Produkte</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Produkt hinzufügen
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-semibold">Neues Produkt</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <div>
              <label className="text-sm font-medium">Preis (€)</label>
              <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <div>
              <label className="text-sm font-medium">Kategorie</label>
              <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <div>
              <label className="text-sm font-medium">Steuersatz (%)</label>
              <input type="number" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={createProduct.isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {createProduct.isPending ? 'Wird erstellt…' : 'Erstellen'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-md border px-4 py-2 text-sm hover:bg-accent">Abbrechen</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">Wird geladen…</p>
      ) : (
        categories.map((cat) => (
          <div key={cat}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{cat}</h2>
            <div className="rounded-xl border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {(products ?? []).filter((p) => p.category === cat).map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.tax_rate}% MwSt</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(p.price)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => deleteProduct.mutate(p.id, { onSuccess: () => toast.success('Produkt entfernt'), onError: (e) => toast.error(e.message) })}
                          className="rounded p-1 hover:bg-destructive/10 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
