import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { GuestOnlyRoute, ProtectedRoute, RoleHomeRedirect } from './routing/ProtectedRoute';
import { StudentDashboardLayout, OwnerDashboardLayout, AdminDashboardLayout } from './layouts/DashboardLayouts';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { StudentDashboardPage } from './pages/student/StudentDashboardPage';
import { SearchPage } from './pages/student/SearchPage';
import { MapPage } from './pages/student/MapPage';
import { PGDetailsPage } from './pages/student/PGDetailsPage';
import { BookingsPage } from './pages/student/BookingsPage';
import { WishlistPage } from './pages/student/WishlistPage';
import { ComplaintsPage } from './pages/student/ComplaintsPage';
import { MyPGPage } from './pages/student/MyPGPage';
import { NotificationsPage } from './pages/student/NotificationsPage';
import { ProfilePage } from './pages/student/ProfilePage';
import { OwnerPGListPage } from './pages/owner/OwnerPGListPage';
import { OwnerPGFormPage } from './pages/owner/OwnerPGFormPage';
import { OwnerBookingsPage } from './pages/owner/OwnerBookingsPage';
import { OwnerComplaintsPage } from './pages/owner/OwnerComplaintsPage';
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { AdminPGVerificationPage } from './pages/admin/AdminPGVerificationPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminComplaintsPage } from './pages/admin/AdminComplaintsPage';
import { useAuth } from './context/AuthContext';

const ScrollTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

const PGDetailRoute: React.FC = () => {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  if (loading) return null;
  return <PGDetailsPage />;
};

const App: React.FC = () => {
  return (
    <>
      <ScrollTop />
      <Routes>
        <Route path="/" element={<RoleHomeRedirect />} />

        <Route path="/login" element={<GuestOnlyRoute><LoginPage /></GuestOnlyRoute>} />
        <Route path="/signup" element={<GuestOnlyRoute><SignupPage /></GuestOnlyRoute>} />

        <Route path="/pg/:id" element={
          <div className="min-h-screen bg-sand-50 dark:bg-slate-900 text-ink-700 dark:text-slate-100 p-4 md:p-6 transition-colors duration-200"><PGDetailRoute /></div>
        } />

        <Route path="/student" element={
          <ProtectedRoute roles={['student']}><StudentDashboardLayout /></ProtectedRoute>
        }>
          <Route index element={<StudentDashboardPage />} />
          <Route path="my-pg" element={<MyPGPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="map" element={<MapPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="wishlist" element={<WishlistPage />} />
          <Route path="complaints" element={<ComplaintsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route path="/owner" element={
          <ProtectedRoute roles={['owner', 'admin']}><OwnerDashboardLayout /></ProtectedRoute>
        }>
          <Route index element={<OwnerPGListPage />} />
          <Route path="pg/new" element={<OwnerPGFormPage />} />
          <Route path="pg/:id/edit" element={<OwnerPGFormPage />} />
          <Route path="pg/:id/images" element={<OwnerPGFormPage />} />
          <Route path="bookings" element={<OwnerBookingsPage />} />
          <Route path="complaints" element={<OwnerComplaintsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route path="/admin" element={
          <ProtectedRoute roles={['admin']}><AdminDashboardLayout /></ProtectedRoute>
        }>
          <Route index element={<AdminOverviewPage />} />
          <Route path="verifications" element={<AdminPGVerificationPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="complaints" element={<AdminComplaintsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const NotFound: React.FC = () => {
  const nav = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-sand-50 dark:bg-slate-900 transition-colors">
      <div className="card p-10 max-w-md text-center shadow-paper border dark:border-slate-700">
        <div className="text-6xl mb-4">🧭</div>
        <h1 className="h1 mb-2">Page not found</h1>
        <p className="text-ink/55 dark:text-slate-400 mb-6">The page you're looking for doesn't exist.</p>
        <button className="btn-primary" onClick={() => nav('/')}>Go home</button>
      </div>
    </div>
  );
};

export default App;
