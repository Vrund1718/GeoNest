import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';

const adminNavItems = [
  { label: 'Overview', path: '/dashboard/admin' },
  { label: 'Users', path: '/dashboard/admin/users' },
  { label: 'PG Verification', path: '/dashboard/admin/verification' },
  { label: 'Complaints', path: '/dashboard/admin/complaints' },
];

export const AdminDashboardLayout = () => {
  return (
    <>
      <Navbar />
      <Sidebar items={adminNavItems} title="Admin Dashboard" />
      <main className="ml-64 pt-16 p-8">
        <Outlet />
      </main>
    </>
  );
};
