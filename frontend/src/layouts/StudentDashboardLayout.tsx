import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';

const studentNavItems = [
  { label: 'Search PGs', path: '/dashboard/student' },
  { label: 'My Bookings', path: '/dashboard/student/bookings' },
  { label: 'Wishlist', path: '/dashboard/student/wishlist' },
  { label: 'Complaints', path: '/dashboard/student/complaints' },
  { label: 'Notifications', path: '/dashboard/student/notifications' },
  { label: 'Profile', path: '/dashboard/student/profile' },
];

export const StudentDashboardLayout = () => {
  return (
    <>
      <Navbar />
      <Sidebar items={studentNavItems} title="Student Dashboard" />
      <main className="ml-64 pt-16 p-8">
        <Outlet />
      </main>
    </>
  );
};
