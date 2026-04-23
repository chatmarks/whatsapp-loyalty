import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';

// Pages
import { SetupPage } from '@/pages/SetupPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { CustomersPage } from '@/pages/CustomersPage';
import { CustomerDetailPage } from '@/pages/CustomerDetailPage';
import { CustomerChatPage } from '@/pages/CustomerChatPage';
import { StampsPage } from '@/pages/StampsPage';
import { RewardsPage } from '@/pages/RewardsPage';
import { BlastsPage } from '@/pages/BlastsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ComingSoonPage } from '@/pages/ComingSoonPage';
import { QrRedirectPage } from '@/pages/QrRedirectPage';
import { CustomerWalletPage } from '@/pages/CustomerWalletPage';

// Architecture kept for future use — not rendered in nav
import { MembershipPage } from '@/pages/MembershipPage';
import { PaymentsPage } from '@/pages/PaymentsPage';

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/r/:slug" element={<QrRedirectPage />} />
      <Route path="/r/:slug/wallet/:token" element={<CustomerWalletPage />} />

      {/* App shell */}
      <Route path="/" element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="setup" element={<SetupPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />
        <Route path="customers/:id/chat" element={<CustomerChatPage />} />
        <Route path="stamps" element={<StampsPage />} />
        <Route path="rewards" element={<RewardsPage />} />
        {/* Legacy redirect */}
        <Route path="vouchers" element={<Navigate to="/rewards" replace />} />
        <Route path="blasts" element={<BlastsPage />} />

        {/* Coming soon */}
        <Route path="orders"   element={<ComingSoonPage title="Bestellungen" description="Bestellungen und Kassen-Integration kommen bald." />} />
        <Route path="products" element={<ComingSoonPage title="Produkte"     description="Produktkatalog und Preislisten kommen bald." />} />

        {/* Settings */}
        <Route path="settings" element={<SettingsPage />} />

        {/* Hidden — architecture kept for later */}
        <Route path="membership" element={<MembershipPage />} />
        <Route path="payments"   element={<PaymentsPage />} />

        {/* Removed pages — redirect to dashboard */}
        <Route path="reports" element={<Navigate to="/" replace />} />
        <Route path="logs"    element={<Navigate to="/" replace />} />
        <Route path="chat"    element={<Navigate to="/" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
