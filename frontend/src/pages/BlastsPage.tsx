import { useState } from 'react';
import { Plus, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useBlasts, useCreateBlast, useSendBlast } from '@/hooks/useBlasts';
import { formatDateTime } from '@/lib/utils';
import type { BlastStatus } from '@/types';

const STATUS_COLORS: Record<BlastStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  scheduled: 'bg-blue-100 text-blue-700',
  sending: 'bg-amber-100 text-amber-700',
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

export function BlastsPage() {
  const { data: blasts, isLoading } = useBlasts();
  const createBlast = useCreateBlast();
  const sendBlast = useSendBlast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', templateName: '', audience: 'all' });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createBlast.mutate(form, {
      onSuccess: () => { toast.success('Kampagne erstellt'); setShowForm(false); },
      onError: (e) => toast.error(e.message),
    });
  }

  function handleSend(id: string) {
    sendBlast.mutate(id, {
      onSuccess: () => toast.success('Kampagne gesendet!'),
      onError: (e) => toast.error(e.message),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Massennachrichten</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Neue Kampagne
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-semibold">Neue Kampagne</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Kampagnenname</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <div>
              <label className="text-sm font-medium">Vorlagenname</label>
              <input value={form.templateName} onChange={(e) => setForm({ ...form, templateName: e.target.value })} required placeholder="approved_template_name" className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <div>
              <label className="text-sm font-medium">Zielgruppe</label>
              <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="all">Alle aktiven Kunden</option>
                <option value="inactive_30">Inaktiv seit 30+ Tagen</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={createBlast.isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
              Entwurf erstellen
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-md border px-4 py-2 text-sm hover:bg-accent">Abbrechen</button>
          </div>
        </form>
      )}

      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Zielgruppe</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Empfänger</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Datum</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Wird geladen…</td></tr>
            ) : (blasts ?? []).length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Noch keine Kampagnen</td></tr>
            ) : (
              (blasts ?? []).map((b) => (
                <tr key={b.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{b.name}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{b.audience}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[b.status]}`}>{b.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">{b.recipient_count ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{formatDateTime(b.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {b.status === 'draft' && (
                      <button
                        onClick={() => handleSend(b.id)}
                        disabled={sendBlast.isPending}
                        className="flex items-center gap-1 rounded-md bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        <Send className="h-3 w-3" /> Senden
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
