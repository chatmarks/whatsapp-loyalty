import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Stamp,
  ShoppingCart,
  Package,
  Ticket,
  Star,
  MessageSquare,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  ChevronDown,
  Palette,
  QrCode,
  CreditCard,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useLogout } from '@/hooks/useAuth';
import { useHasUnread } from '@/hooks/useConversations';

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
      { label: 'Dashboard', to: '/', icon: LayoutDashboard, end: true },
      { label: 'Chat', to: '/chat', icon: MessageSquare },
    ],
  },
  {
    label: 'Kunden & Treue',
    items: [
      { label: 'Kunden',     to: '/customers', icon: Users },
      { label: 'Stempel',    to: '/stamps',    icon: Stamp },
      { label: 'Gutscheine', to: '/vouchers',  icon: Ticket },
    ],
  },
  {
    label: 'Verkauf',
    items: [
      { label: 'Bestellungen', to: '/orders',   icon: ShoppingCart },
      { label: 'Produkte',     to: '/products', icon: Package },
    ],
  },
  {
    label: 'Analyse',
    items: [
      { label: 'Berichte',  to: '/reports', icon: BarChart3 },
      { label: 'Protokoll', to: '/logs',    icon: Bell },
    ],
  },
  {
    label: 'Demnächst',
    items: [
      { label: 'Mitgliedschaft', icon: Star,           comingSoon: true },
      { label: 'Kampagnen',      icon: MessageSquare,  comingSoon: true },
    ],
  },
];

const SETTINGS_ITEMS: NavItem[] = [
  { label: 'Allgemein',        to: '/settings',                    icon: SlidersHorizontal },
  { label: 'Erscheinungsbild', to: '/settings?tab=erscheinungsbild', icon: Palette },
  { label: 'QR-Code',          to: '/settings?tab=qrcode',          icon: QrCode },
  { label: 'Abonnement',       to: '/settings?tab=abonnement',      icon: CreditCard },
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
  const location = useLocation();
  const hasUnread = useHasUnread();
  const isOnSettings = location.pathname === '/settings';
  const [settingsOpen, setSettingsOpen] = useState(isOnSettings);

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
                  {item.to === '/chat' ? (
                    <NavLink
                      to="/chat"
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
                        )
                      }
                    >
                      <MessageSquare className="h-4 w-4 shrink-0" />
                      Chat
                      {hasUnread && (
                        <span className="ml-auto h-2 w-2 rounded-full bg-primary" />
                      )}
                    </NavLink>
                  ) : (
                    <NavItemRow item={item} />
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Einstellungen + Abmelden */}
      <div className="border-t p-2 space-y-0.5">
        {/* Einstellungen Toggle */}
        <button
          onClick={() => setSettingsOpen((o) => !o)}
          className={cn(
            'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            isOnSettings
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          Einstellungen
          <ChevronDown
            className={cn('ml-auto h-3.5 w-3.5 transition-transform', settingsOpen && 'rotate-180')}
          />
        </button>

        {/* Untermenü */}
        {settingsOpen && (
          <ul className="ml-4 space-y-0.5 border-l pl-2">
            {SETTINGS_ITEMS.map((item) => (
              <li key={item.label}>
                <NavLink
                  to={item.to!}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
                    )
                  }
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        )}

        {/* Abmelden */}
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
