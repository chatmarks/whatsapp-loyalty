import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { ChatSlideout } from './ChatSlideout';
import { StampApprovalModal } from '@/components/stamps/StampApprovalModal';
import { useHasUnread } from '@/hooks/useConversations';
import { cn } from '@/lib/utils';

export function AppShell() {
  const [chatOpen, setChatOpen] = useState(false);
  const hasUnread = useHasUnread();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-12 shrink-0 items-center justify-end border-b bg-card px-4 gap-2">
          <button
            onClick={() => setChatOpen(true)}
            className={cn(
              'relative flex h-8 w-8 items-center justify-center rounded-md transition-colors',
              'text-muted-foreground hover:bg-accent hover:text-foreground',
              chatOpen && 'bg-accent text-foreground',
            )}
            aria-label="Nachrichten öffnen"
          >
            <Bell className="h-4 w-4" />
            {hasUnread && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
            )}
          </button>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      <ChatSlideout open={chatOpen} onClose={() => setChatOpen(false)} />
      <StampApprovalModal />
    </div>
  );
}
