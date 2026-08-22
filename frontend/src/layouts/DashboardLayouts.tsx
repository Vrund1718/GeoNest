import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

interface NavItem { path: string; label: string; icon: string; }

interface LayoutProps {
  navItems: NavItem[];
  brand: string;
}

export const DashboardLayout: React.FC<LayoutProps> = ({ navItems, brand }) => {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/notifications');
        setUnreadCount(data.unreadCount || 0);
        setNotifications(data.notifications || []);
      } catch {}
    };
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  const markRead = async (n: Notification) => {
    try {
      if (!n.isRead) {
        await api.put(`/notifications/${n._id}/read`);
        setNotifications((p) => p.map(item => item._id === n._id ? { ...item, isRead: true } : item));
        setUnreadCount((c) => Math.max(0, c - 1));
      }

      // Redirection logic
      let target = n.actionUrl;

      if (!target) {
        const isStudent = user?.role === 'student';
        const isOwner = user?.role === 'owner';

        switch (n.type) {
          case 'booking_request':
          case 'booking_confirm':
          case 'booking_cancel':
            target = isStudent 
              ? (n.referenceId ? `/student/bookings#${n.referenceId}` : '/student/bookings')
              : isOwner 
                ? (n.referenceId ? `/owner/bookings#${n.referenceId}` : '/owner/bookings')
                : '/student/bookings';
            break;
          case 'pg_verified':
          case 'pg_rejected':
            target = n.referenceId 
              ? `/pg/${n.referenceId}` 
              : (isOwner ? '/owner' : '/student/search');
            break;
          case 'complaint_status':
            target = isStudent 
              ? (n.referenceId ? `/student/complaints#${n.referenceId}` : '/student/complaints')
              : isOwner 
                ? (n.referenceId ? `/owner/complaints#${n.referenceId}` : '/owner/complaints')
                : '/student/complaints';
            break;
          case 'new_review':
            target = n.referenceId ? `/pg/${n.referenceId}#reviews` : '/student/search';
            break;
          case 'new_message':
            target = n.referenceId ? `/messages/${n.referenceId}` : '/';
            break;
          default:
            target = undefined; // Don't navigate for general or unknown
        }
      }

      if (target) {
        nav(target);
      }
      setShowNotif(false);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleLogout = async () => {
    await logout();
    nav('/login', { replace: true });
  };

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-sand-50 flex">
      <aside className="w-64 bg-white border-r border-ink/15 flex flex-col shrink-0">
        <div className="p-5 border-b border-ink/10">
          <Link to={navItems[0]?.path || '/'} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white grid place-items-center shadow-pop">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 10.5 12 3l9 7.5" />
                <path d="M5 9.5V21h14V9.5" />
              </svg>
            </div>
            <div>
              <div className="font-display font-semibold text-ink-700 leading-tight">GeoNest</div>
              <div className="text-xs text-ink/55">{brand}</div>
            </div>
          </Link>
        </div>
        <nav className="p-3 space-y-1 flex-1">
          {navItems.map((item) => {
            const active = loc.pathname === item.path || loc.pathname.startsWith(item.path + '/');
            return (
              <Link key={item.path} to={item.path} className={`sidebar-link ${active ? 'sidebar-link-active' : ''}`}>
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 space-y-2 border-t border-ink/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-ink/70 hover:text-coral hover:bg-coral/5 transition-all group"
          >
            <span className="text-xl group-hover:scale-110 transition-transform">🚪</span>
            <span className="font-medium">Logout</span>
          </button>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-sand-50 ring-1 ring-ink/10">
            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-semibold grid place-items-center text-sm shadow-sm">{initials}</div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-ink-700 truncate">{user?.name}</div>
              <div className="text-xs text-ink/55 capitalize truncate">{user?.role}</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-ink/10 flex items-center justify-between px-6 gap-4 sticky top-0 z-20">
          <div className="text-sm text-ink/55 hidden md:block">Ahmedabad, Gujarat</div>
          <div className="flex-1" />
          <div className="relative">
            <button
              onClick={() => setShowNotif((s) => !s)}
              className="relative w-10 h-10 rounded-xl hover:bg-sand-100 grid place-items-center transition"
              aria-label="Notifications"
            >
              <span className="text-lg" aria-hidden="true">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-coral text-white text-[10px] font-bold grid place-items-center shadow-sm">{unreadCount}</span>
              )}
            </button>
            {showNotif && (
              <div className="absolute right-0 mt-2 w-80 card shadow-pop z-40 overflow-hidden">
                <div className="px-4 py-3 border-b border-ink/10 flex items-center justify-between">
                  <h4 className="font-semibold text-ink-700">Notifications</h4>
                  <span className="badge bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">{unreadCount} unread</span>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-sm text-ink/50">No notifications yet.</div>
                  ) : notifications.slice(0, 15).map((n) => (
                    <button
                      key={n._id}
                      onClick={() => markRead(n)}
                      className={`w-full text-left p-4 border-b border-ink/10 hover:bg-sand-50 transition ${!n.isRead ? 'bg-indigo-50/40' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-medium text-ink-700">{n.title}</div>
                        {!n.isRead && <span className="w-2 h-2 rounded-full bg-marigold-500 shrink-0 mt-1.5" />}
                      </div>
                      <div className="text-xs text-ink/60 mt-1 line-clamp-2">{n.body}</div>
                      <div className="text-[11px] text-ink/40 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                    </button>
                  ))}
                </div>
                <Link to={user?.role === 'student' ? '/student/notifications' : '/notifications'} onClick={() => setShowNotif(false)} className="block text-center text-sm text-indigo-600 hover:bg-sand-50 py-2 border-t border-ink/10 font-semibold underline-offset-4 hover:underline transition-colors">View all</Link>
              </div>
            )}
          </div>
          <Link to={user?.role === 'student' ? '/student/profile' : '/profile'} className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-semibold grid place-items-center text-sm hover:bg-indigo-200 transition shadow-sm">{initials}</Link>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const studentNav = [
  { path: '/student', label: 'Dashboard', icon: '🏠' },
  { path: '/student/my-pg', label: 'My PG', icon: '🏢' },
  { path: '/student/search', label: 'Search PGs', icon: '🔍' },
  { path: '/student/map', label: 'Map View', icon: '🗺️' },
  { path: '/student/bookings', label: 'Bookings', icon: '📅' },
  { path: '/student/wishlist', label: 'Wishlist', icon: '⭐' },
  { path: '/student/complaints', label: 'Complaints', icon: '⚠️' },
  { path: '/student/notifications', label: 'Notifications', icon: '🔔' },
  { path: '/student/profile', label: 'Profile', icon: '👤' },
];

const ownerNav = [
  { path: '/owner', label: 'My PGs', icon: '🏢' },
  { path: '/owner/pg/new', label: 'Add New PG', icon: '➕' },
  { path: '/owner/bookings', label: 'Booking Requests', icon: '📋' },
  { path: '/owner/complaints', label: 'Complaints', icon: '⚠️' },
  { path: '/owner/profile', label: 'Profile', icon: '👤' },
];

const adminNav = [
  { path: '/admin', label: 'Overview', icon: '📊' },
  { path: '/admin/verifications', label: 'PG Verifications', icon: '✅' },
  { path: '/admin/users', label: 'Users', icon: '👥' },
  { path: '/admin/complaints', label: 'Complaints', icon: '⚠️' },
];

export const StudentDashboardLayout: React.FC = () => <DashboardLayout navItems={studentNav} brand="Student Dashboard" />;
export const OwnerDashboardLayout: React.FC = () => <DashboardLayout navItems={ownerNav} brand="Owner Dashboard" />;
export const AdminDashboardLayout: React.FC = () => <DashboardLayout navItems={adminNav} brand="Admin Dashboard" />;
