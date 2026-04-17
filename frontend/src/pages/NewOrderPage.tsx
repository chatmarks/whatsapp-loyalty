import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { useProducts } from '@/hooks/useProducts';
import { useCreateOrder } from '@/hooks/useOrders';
import { useCustomers } from '@/hooks/useCustomers';
import { formatCurrency } from '@/lib/utils';
import type { Product, Customer } from '@/types';

interface CartItem extends Product { qty: number }

export function NewOrderPage() {
  const [search, setSearch] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [remark, setRemark] = useState('');
  const [notify, setNotify] = useState(false);

  const { data: products } = useProducts();
  const { data: customersRes } = useCustomers({ ...(search.length > 1 ? { search } : {}), optedOut: 'false' });
  const createOrder = useCreateOrder();
  const navigate = useNavigate();

  const categories = [...new Set((products ?? []).map((p) => p.category))];

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
  }

  function updateQty(id: string, delta: number) {
    setCart((prev) =>
      prev.map((i) => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i)
        .filter((i) => i.qty > 0),
    );
  }

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const taxTotal = cart.reduce((s, i) => s + i.price * i.qty * (i.tax_rate / 100), 0);
  const total = subtotal + taxTotal;

  function handleSubmit() {
    if (cart.length === 0) { toast.error('Warenkorb ist leer'); return; }
    createOrder.mutate(
      {
        ...(customer?.id ? { customerId: customer.id } : {}),
        lineItems: cart.map((i) => ({
          productId: i.id,
          name: i.name,
          qty: i.qty,
          unitPrice: i.price,
          taxRate: i.tax_rate,
        })),
        paymentMethod,
        ...(remark ? { remark } : {}),
        notifyWhatsApp: notify,
      },
      {
        onSuccess: () => { toast.success('Bestellung erstellt!'); navigate('/orders'); },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Bestellung hinzufügen</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Product catalog */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bestellpositionen</p>

            {categories.map((cat) => (
              <div key={cat} className="mb-4">
                <p className="mb-2 text-sm font-medium text-muted-foreground">{cat}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(products ?? []).filter((p) => p.category === cat).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className="rounded-lg border bg-background p-3 text-left hover:bg-accent transition-colors"
                    >
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatCurrency(p.price)}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {(!products || products.length === 0) && (
              <p className="text-sm text-muted-foreground">Noch keine Produkte. Füge welche unter Produkte hinzu.</p>
            )}
          </div>
        </div>

        {/* Cart + summary */}
        <div className="space-y-4">
          {/* Customer */}
          <div className="rounded-xl border bg-card p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kunde</p>
            {customer ? (
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{customer.display_name ?? customer.phone_display}</span>
                <button className="text-xs text-muted-foreground underline" onClick={() => setCustomer(null)}>Entfernen</button>
              </div>
            ) : (
              <div className="relative">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Mitglied suchen…"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {search.length > 1 && customersRes?.data && customersRes.data.length > 0 && (
                  <div className="absolute top-full left-0 z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
                    {customersRes.data.map((c) => (
                      <button
                        key={c.id}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                        onClick={() => { setCustomer(c); setSearch(''); }}
                      >
                        {c.display_name ?? '—'} <span className="text-muted-foreground">{c.phone_display}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cart */}
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <ShoppingCart className="inline h-3 w-3 mr-1" />Warenkorb
              </p>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-xs text-destructive hover:underline">
                  <Trash2 className="inline h-3 w-3 mr-1" />Leeren
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine Artikel</p>
            ) : (
              <ul className="space-y-2">
                {cart.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 truncate">{item.name}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item.id, -1)} className="rounded p-0.5 hover:bg-accent"><Minus className="h-3 w-3" /></button>
                      <span className="w-6 text-center font-semibold">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="rounded p-0.5 hover:bg-accent"><Plus className="h-3 w-3" /></button>
                    </div>
                    <span className="w-16 text-right font-medium">{formatCurrency(item.price * item.qty)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Bill summary */}
          <div className="rounded-xl border bg-card p-4 text-sm space-y-2">
            <p className="font-semibold">Rechnungsübersicht</p>
            <div className="flex justify-between text-muted-foreground">
              <span>Zwischensumme</span><span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>MwSt.</span><span>{formatCurrency(taxTotal)}</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>Gesamt</span><span>{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Payment method */}
          <div className="rounded-xl border bg-card p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Zahlungsart</p>
            <div className="flex gap-2">
              {(['cash', 'card'] as const).map((pm) => (
                <button
                  key={pm}
                  onClick={() => setPaymentMethod(pm)}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${paymentMethod === pm ? 'bg-primary text-primary-foreground' : 'border hover:bg-accent'}`}
                >
                  {pm === 'cash' ? 'Bar' : 'Karte'}
                </button>
              ))}
            </div>
          </div>

          {/* Confirm */}
          <div className="rounded-xl bg-slate-900 p-4 text-white">
            <div className="flex justify-between mb-3">
              <span className="text-xs text-green-400 font-semibold uppercase">Zu vergebende Belohnungen</span>
              <span className="text-xs text-slate-400">Fälliger Betrag</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-sm">{customer ? '+1 Stempel' : 'Kein Kunde'}</span>
              <span className="text-2xl font-bold">{formatCurrency(total)}</span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={createOrder.isPending || cart.length === 0}
              className="mt-4 w-full rounded-lg bg-green-500 py-3 text-sm font-bold text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
            >
              {createOrder.isPending ? 'Wird aufgegeben…' : 'Bestätigen & Bestellung aufgeben'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
