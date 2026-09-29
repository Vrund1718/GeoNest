import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Notification } from '../types';
import { Menu, X, Bell, LogOut, MapPin, Building, ChevronRight } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { LanguageSelector } from '../components/LanguageSelector';
import { AIChatDrawer } from '../components/AIChatDrawer';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [loc.pathname]);

  // Handle escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setShowNotif(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
            target = undefined;
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

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-4 sm:p-5 border-b border-ink/10 flex items-center justify-between">
        <Link to={navItems[0]?.path || '/'} className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white grid place-items-center shadow-pop shrink-0">
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
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-2 text-ink/60 hover:text-ink hover:bg-sand-100 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = loc.pathname === item.path || (item.path !== '/' && loc.pathname.startsWith(item.path + '/'));
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`sidebar-link ${active ? 'sidebar-link-active' : ''} min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors`}
            >
              <span className="text-lg shrink-0">{item.icon}</span>
              <span className="font-medium text-sm truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 space-y-2 border-t border-ink/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-ink/70 hover:text-coral hover:bg-coral/5 transition-all group min-h-[44px]"
        >
          <LogOut className="w-5 h-5 text-coral/80 group-hover:scale-110 transition-transform" />
          <span className="font-medium text-sm">Logout</span>
        </button>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-sand-50 ring-1 ring-ink/10">
          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-semibold grid place-items-center text-sm shadow-sm shrink-0">{initials}</div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-ink-700 truncate">{user?.name}</div>
            <div className="text-xs text-ink/55 capitalize truncate">{user?.role}</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-sand-50 dark:bg-slate-900 flex flex-col lg:flex-row transition-colors duration-200">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white dark:bg-slate-800 border-r border-ink/15 dark:border-slate-700 flex-col shrink-0 sticky top-0 h-screen z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-in Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 lg:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer Panel */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-white dark:bg-slate-800 z-50 lg:hidden shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation drawer"
      >
        {sidebarContent}
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white dark:bg-slate-800 border-b border-ink/10 dark:border-slate-700 flex items-center justify-between px-3 sm:px-6 gap-2 sm:gap-4 sticky top-0 z-20 transition-colors">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-ink/70 hover:text-ink dark:text-slate-200 dark:hover:text-white rounded-xl hover:bg-sand-100 dark:hover:bg-slate-700 min-w-[44px] min-h-[44px] flex items-center justify-center transition"
              aria-label="Open mobile menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Brand display for mobile */}
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white grid place-items-center shadow-sm">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3 10.5 12 3l9 7.5" />
                  <path d="M5 9.5V21h14V9.5" />
                </svg>
              </div>
              <span className="font-display font-semibold text-ink-700 dark:text-slate-100 text-base">GeoNest</span>
            </div>

            <div className="text-xs sm:text-sm text-ink/55 dark:text-slate-400 hidden sm:flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-indigo-500" />
              <span>Ahmedabad, Gujarat</span>
            </div>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <LanguageSelector />
            <ThemeToggle />
            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotif((s) => !s)}
                className="relative w-10 h-10 rounded-xl hover:bg-sand-100 dark:hover:bg-slate-700 grid place-items-center transition text-ink-700 dark:text-slate-200 min-w-[44px] min-h-[44px]"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-coral text-white text-[10px] font-bold grid place-items-center shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotif && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 card shadow-pop z-40 overflow-hidden bg-white dark:bg-slate-800 border dark:border-slate-700">
                  <div className="px-4 py-3 border-b border-ink/10 dark:border-slate-700 flex items-center justify-between">
                    <h4 className="font-semibold text-ink-700 dark:text-slate-200 text-sm sm:text-base">Notifications</h4>
                    <span className="badge bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-100 dark:ring-indigo-800 text-xs">
                      {unreadCount} unread
                    </span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-sm text-ink/50 dark:text-slate-400">No notifications yet.</div>
                    ) : notifications.slice(0, 15).map((n) => (
                      <button
                        key={n._id}
                        onClick={() => markRead(n)}
                        className={`w-full text-left p-3.5 border-b border-ink/10 dark:border-slate-700 hover:bg-sand-50 dark:hover:bg-slate-700/50 transition ${
                          !n.isRead ? 'bg-indigo-50/40 dark:bg-indigo-950/30' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-xs sm:text-sm font-medium text-ink-700 dark:text-slate-200">{n.title}</div>
                          {!n.isRead && <span className="w-2 h-2 rounded-full bg-marigold-500 shrink-0 mt-1.5" />}
                        </div>
                        <div className="text-xs text-ink/60 dark:text-slate-400 mt-1 line-clamp-2">{n.body}</div>
                        <div className="text-[10px] text-ink/40 dark:text-slate-500 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                      </button>
                    ))}
                  </div>
                  <Link
                    to={user?.role === 'student' ? '/student/notifications' : user?.role === 'owner' ? '/owner/notifications' : '/admin/notifications'}
                    onClick={() => setShowNotif(false)}
                    className="block text-center text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 hover:bg-sand-50 dark:hover:bg-slate-700 py-2 border-t border-ink/10 dark:border-slate-700 font-semibold underline-offset-4 hover:underline transition-colors"
                  >
                    View all
                  </Link>
                </div>
              )}
            </div>

            {/* Profile Link */}
            <Link
              to={user?.role === 'student' ? '/student/profile' : user?.role === 'owner' ? '/owner/profile' : '/admin/profile'}
              className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold grid place-items-center text-sm hover:bg-indigo-200 dark:hover:bg-indigo-800 transition shadow-sm shrink-0 min-w-[40px] min-h-[40px]"
            >
              {initials}
            </Link>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 p-3 sm:p-6 overflow-x-hidden min-w-0">
          <Outlet />
        </main>
        <AIChatDrawer />
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
