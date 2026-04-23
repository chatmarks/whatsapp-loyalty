import { useState } from 'react';
import {
  Users, Stamp, Ticket, Gift, ScanBarcode, UserCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBusinessStats } from '@/hooks/useBusiness';
import { IssueStampsModal } from '@/components/stamps/IssueStampsModal';

function StatCard({
  label,
  value,
  icon: Icon,
  color = 'text-primary',
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg bg-muted p-2 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <p className="mt-3 text-3xl font-bold">{value}</p>
    </div>
  );
}

function QuickActionButton({
  label,
  icon: Icon,
  onClick,
  color = 'bg-muted',
}: {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-3 rounded-xl border bg-card p-5 shadow-sm hover:bg-accent/50 transition-colors"
    >
      <div className={`rounded-full p-3 ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

export function DashboardPage() {
  const { data: stats, isLoading } = useBusinessStats();
  const navigate = useNavigate();
  const [stampsOpen, setStampsOpen] = useState(false);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Übersicht</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Mitglieder"  value={isLoading ? '…' : (stats?.memberCount ?? 0)}    icon={Users}       color="text-blue-500" />
        <StatCard label="Stempel"     value={isLoading ? '…' : (stats?.stampTotal ?? 0)}     icon={Stamp}       color="text-amber-500" />
        <StatCard label="Aktiv"       value={isLoading ? '…' : (stats?.vouchersActive ?? 0)} icon={Ticket}      color="text-violet-500" />
        <StatCard label="Ausgestellt" value={isLoading ? '…' : (stats?.vouchersIssued ?? 0)} icon={Gift}        color="text-pink-500" />
        <StatCard label="Abgeholt"    value={isLoading ? '…' : (stats?.vouchersClaimed ?? 0)} icon={ScanBarcode} color="text-orange-500" />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <span className="h-5 w-1 rounded-full bg-primary" />
          Schnellaktionen
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickActionButton label="Stempel vergeben"    icon={Stamp}       onClick={() => setStampsOpen(true)}     color="bg-blue-100 text-blue-600" />
          <QuickActionButton label="Belohnung ausstellen" icon={Ticket}      onClick={() => navigate('/rewards')}   color="bg-violet-100 text-violet-600" />
          <QuickActionButton label="Belohnung einlösen"   icon={ScanBarcode} onClick={() => navigate('/rewards')}   color="bg-pink-100 text-pink-600" />
          <QuickActionButton label="Belohnung abholen"    icon={Gift}        onClick={() => navigate('/rewards')}   color="bg-amber-100 text-amber-600" />
          <QuickActionButton label="Kunden"               icon={UserCheck}   onClick={() => navigate('/customers')} color="bg-sky-100 text-sky-600" />
        </div>
      </div>

      <IssueStampsModal open={stampsOpen} onOpenChange={setStampsOpen} />
    </div>
  );
}
