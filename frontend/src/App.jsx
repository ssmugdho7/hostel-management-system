import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import AppShell from './components/shared/AppShell';
import LoadingBlock from './components/shared/LoadingBlock';
import Toast from './components/shared/Toast';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { useAuth } from './hooks/useAuth';
import { useToast } from './hooks/useToast';
import AuthPage from './pages/auth/AuthPage';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import ProfilePage from './pages/customer/ProfilePage';
import SeatsPage from './pages/customer/SeatsPage';
import RentPage from './pages/customer/RentPage';
import LeavePage from './pages/customer/LeavePage';
import ExitPage from './pages/customer/ExitPage';
import NotificationsPage from './pages/customer/NotificationsPage';
import AnnouncementsPage from './pages/customer/AnnouncementsPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminRequests from './pages/admin/AdminRequests';
import AdminAnnouncements from './pages/admin/AdminAnnouncements';

const customerRoutes = [
  ['dashboard', 'Dashboard', CustomerDashboard],
  ['seats', 'Seat Change', SeatsPage],
  ['rent', 'Rent', RentPage],
  ['leave', 'Leave', LeavePage],
  ['exit', 'Exit', ExitPage],
  ['notifications', 'Notifications', NotificationsPage],
  ['announcements', 'Announcements', AnnouncementsPage],
  ['profile', 'Profile', ProfilePage],
];

const adminRoutes = [
  ['admin-dashboard', 'Overview', AdminDashboard],
  ['admin-requests', 'Requests', AdminRequests],
  ['admin-announcements', 'Announcements', AdminAnnouncements],
  ['profile', 'Profile', ProfilePage],
];

function ProtectedShell() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate('/auth', { replace: true });
  }

  function handleNav(key) {
    navigate('/' + key);
  }

  if (loading) {
    return (
      <main className="splash">
        <LoadingBlock label="Checking session..." />
      </main>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const isAdmin = user.role === 'admin';
  const view = location.pathname.replace(/^\//, '').split('/')[0] || (isAdmin ? 'admin-dashboard' : 'dashboard');

  // Determine which page to render based on current path
  const allRoutes = isAdmin ? [...adminRoutes, ...customerRoutes] : customerRoutes;
  const match = allRoutes.find(([key]) => key === view);
  const Page = match?.[2] || (isAdmin ? AdminDashboard : CustomerDashboard);

  return (
    <AppShell user={user} view={view} setView={handleNav} onLogout={handleLogout}>
      <Page />
    </AppShell>
  );
}

function UnauthedAuthRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <main className="splash">
        <LoadingBlock label="Checking session..." />
      </main>
    );
  }
  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin-dashboard' : '/dashboard'} replace />;
  }
  return <AuthPage />;
}

function AppContent() {
  const { toast } = useToast();
  return (
    <>
      <Toast toast={toast} />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<UnauthedAuthRoute />} />
          <Route path="/*" element={<ProtectedShell />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default function App() {
  useEffect(() => {
    document.title = 'Hostel Management System';
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}
