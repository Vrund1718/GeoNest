import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';

const ownerNavItems = [
  { label: 'My PGs', path: '/dashboard/owner' },
  { label: 'Add PG', path: '/dashboard/owner/add' },
  { label: 'Booking Requests', path: '/dashboard/owner/bookings' },
  { label: 'Complaints', path: '/dashboard/owner/complaints' },
];

export const OwnerDashboardLayout = () => {
  return (
    <>
      <Navbar />
      <Sidebar items={ownerNavItems} title="Owner Dashboard" />
      <main className="ml-64 pt-16 p-8">
        <Outlet />
      </main>
    </>
  );
};
