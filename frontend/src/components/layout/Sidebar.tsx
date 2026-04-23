import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Stamp,
  ShoppingCart,
  Package,
  Gift,
  MessageSquare,
  Settings,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useLogout } from '@/hooks/useAuth';

// ── Typen ────────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  icon: React.ElementType;
  to?: string;
  end?: boolean;
  comingSoon?: boolean;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

// ── Navigation-Struktur ──────────────────────────────────────────────────────

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: 'Übersicht', to: '/', icon: LayoutDashboard, end: true },
    ],
  },
  {
    label: 'Kunden & Treue',
    items: [
      { label: 'Kunden',      to: '/customers', icon: Users },
      { label: 'Stempel',     to: '/stamps',    icon: Stamp },
      { label: 'Belohnungen', to: '/rewards',   icon: Gift },
      { label: 'Broadcasts',  to: '/blasts',    icon: MessageSquare },
    ],
  },
  {
    label: 'Verkauf',
    items: [
      { label: 'Bestellungen', icon: ShoppingCart, comingSoon: true },
      { label: 'Produkte',     icon: Package,      comingSoon: true },
    ],
  },
];

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────

function NavItemRow({ item }: { item: NavItem }) {
  const Icon = item.icon;

  if (item.comingSoon) {
    return (
      <span className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/40 cursor-default select-none">
        <Icon className="h-4 w-4 shrink-0" />
        {item.label}
        <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide bg-muted text-muted-foreground rounded px-1.5 py-0.5">
          Bald
        </span>
      </span>
    );
  }

  return (
    <NavLink
      to={item.to!}
      {...(item.end ? { end: true } : {})}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {item.label}
    </NavLink>
  );
}

// ── Hauptkomponente ──────────────────────────────────────────────────────────

export function Sidebar() {
  const business = useAuthStore((s) => s.business);
  const logout = useLogout();

  return (
    <aside className="flex h-full w-60 flex-col border-r bg-sidebar">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
          {business?.businessName?.charAt(0) ?? 'L'}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-sidebar-foreground">
            {business?.businessName ?? 'Loyalty App'}
          </p>
          <p className="text-xs text-muted-foreground capitalize">{business?.plan ?? 'free'}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {NAV_GROUPS.map((group, i) => (
          <div key={i}>
            {group.label && (
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.label}>
                  <NavItemRow item={item} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Einstellungen + Abmelden */}
      <div className="border-t p-2 space-y-0.5">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
            )
          }
        >
          <Settings className="h-4 w-4 shrink-0" />
          Einstellungen
        </NavLink>

        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Abmelden
        </button>
      </div>
    </aside>
  );
}
