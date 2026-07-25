import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { LoginPage } from '../pages/auth/LoginPage';
import { OtpLoginPage } from '../pages/auth/OtpLoginPage';
import { SignupPage } from '../pages/auth/SignupPage';
import { StudentDashboardLayout } from '../layouts/StudentDashboardLayout';
import { OwnerDashboardLayout } from '../layouts/OwnerDashboardLayout';
import { AdminDashboardLayout } from '../layouts/AdminDashboardLayout';
import { SearchPage } from '../pages/student/SearchPage';
import { PGDetailsPage } from '../pages/student/PGDetailsPage';
import { WishlistPage } from '../pages/student/WishlistPage';
import { BookingPage } from '../pages/student/BookingPage';
import { ComplaintPage } from '../pages/student/ComplaintPage';
import { NotificationsPage } from '../pages/student/NotificationsPage';
import { ProfilePage } from '../pages/student/ProfilePage';
import { OwnerPGListPage } from '../pages/owner/OwnerPGListPage';
import { OwnerPGFormPage } from '../pages/owner/OwnerPGFormPage';
import { OwnerBookingRequestsPage } from '../pages/owner/OwnerBookingRequestsPage';
import { OwnerComplaintsPage } from '../pages/owner/OwnerComplaintsPage';
import { AdminOverviewPage } from '../pages/admin/AdminOverviewPage';
import { AdminUsersPage } from '../pages/admin/AdminUsersPage';
import { AdminPGVerificationPage } from '../pages/admin/AdminPGVerificationPage';
import { AdminComplaintsPage } from '../pages/admin/AdminComplaintsPage';

const RedirectAfterAuth = () => {
  const { user } = useAuth();
  if (user) {
    return <Navigate to={`/dashboard/${user.role}`} replace />;
  }
  return null;
};

const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <>
        <RedirectAfterAuth />
        <LoginPage />
      </>
    ),
  },
  {
    path: '/login/otp',
    element: (
      <>
        <RedirectAfterAuth />
        <OtpLoginPage />
      </>
    ),
  },
  {
    path: '/signup',
    element: (
      <>
        <RedirectAfterAuth />
        <SignupPage />
      </>
    ),
  },
  {
    path: '/dashboard/student',
    element: (
      <ProtectedRoute allowedRoles={['student']}>
        <StudentDashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <SearchPage />,
      },
      {
        path: 'pg/:id',
        element: <PGDetailsPage />,
      },
      {
        path: 'wishlist',
        element: <WishlistPage />,
      },
      {
        path: 'bookings',
        element: <BookingPage />,
      },
      {
        path: 'complaints',
        element: <ComplaintPage />,
      },
      {
        path: 'notifications',
        element: <NotificationsPage />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
    ],
  },
  {
    path: '/dashboard/owner',
    element: (
      <ProtectedRoute allowedRoles={['owner']}>
        <OwnerDashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <OwnerPGListPage />,
      },
      {
        path: 'add',
        element: <OwnerPGFormPage />,
      },
      {
        path: 'bookings',
        element: <OwnerBookingRequestsPage />,
      },
      {
        path: 'complaints',
        element: <OwnerComplaintsPage />,
      },
    ],
  },
  {
    path: '/dashboard/admin',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminDashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <AdminOverviewPage />,
      },
      {
        path: 'users',
        element: <AdminUsersPage />,
      },
      {
        path: 'verification',
        element: <AdminPGVerificationPage />,
      },
      {
        path: 'complaints',
        element: <AdminComplaintsPage />,
      },
    ],
  },
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
]);

export const AppRouter = () => {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
};
