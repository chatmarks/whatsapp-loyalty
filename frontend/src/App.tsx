import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';

// Pages
import { SetupPage } from '@/pages/SetupPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { CustomersPage } from '@/pages/CustomersPage';
import { CustomerDetailPage } from '@/pages/CustomerDetailPage';
import { CustomerChatPage } from '@/pages/CustomerChatPage';
import { StampsPage } from '@/pages/StampsPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { NewOrderPage } from '@/pages/NewOrderPage';
import { OrderDetailPage } from '@/pages/OrderDetailPage';
import { ProductsPage } from '@/pages/ProductsPage';
import { VouchersPage } from '@/pages/VouchersPage';
import { MembershipPage } from '@/pages/MembershipPage';
import { AppearancePage } from '@/pages/AppearancePage';
import { QRCodePage } from '@/pages/QRCodePage';
import { BlastsPage } from '@/pages/BlastsPage';
import { NotificationLogsPage } from '@/pages/NotificationLogsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { PaymentsPage } from '@/pages/PaymentsPage';
import { PublicRegistrationPage } from '@/pages/PublicRegistrationPage';
import { CustomerWalletPage } from '@/pages/CustomerWalletPage';
import { ChatListPage } from '@/pages/ChatListPage';

// TODO: Auth guard re-enable when login flow is implemented
export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/r/:slug" element={<PublicRegistrationPage />} />
      <Route path="/r/:slug/wallet/:token" element={<CustomerWalletPage />} />

      {/* App shell — auth guard removed temporarily */}
      <Route path="/" element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="setup" element={<SetupPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />
        <Route path="customers/:id/chat" element={<CustomerChatPage />} />
        <Route path="chat" element={<ChatListPage />} />
        <Route path="stamps" element={<StampsPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/new" element={<NewOrderPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="vouchers" element={<VouchersPage />} />
        <Route path="membership" element={<MembershipPage />} />
        <Route path="loyalty/card" element={<AppearancePage />} />
        <Route path="loyalty/qr" element={<QRCodePage />} />
        <Route path="blasts" element={<BlastsPage />} />
        <Route path="logs" element={<NotificationLogsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
