import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Notification } from '../../types';
import { EmptyState, PageHeader } from '../../components/shared';
import { useAuth } from '../../context/AuthContext';

const iconFor = (t: Notification['type']) =>
  t === 'booking_request' ? '📋' :
  t === 'booking_confirm' ? '✅' :
  t === 'booking_cancel' ? '❌' :
  t === 'pg_verified' ? '🏠' :
  t === 'complaint_status' ? '⚠️' : '🔔';

export const NotificationsPage: React.FC = () => {
  const nav = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await api.get('/notifications');
      setItems(data.notifications || []);
      setUnread(data.unreadCount || 0);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markAll = async () => {
    for (const n of items) if (!n.isRead) await api.put(`/notifications/${n._id}/read`);
    load();
  };

  const handleNotifClick = async (n: Notification) => {
    // 1. Mark as read immediately in UI
    if (!n.isRead) {
      setItems(prev => prev.map(item => item._id === n._id ? { ...item, isRead: true } : item));
      setUnread(prev => Math.max(0, prev - 1));
      api.put(`/notifications/${n._id}/read`).catch((err) => {
        console.error('Failed to mark notification as read:', err);
      });
    }

    // 2. Determine target URL
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
            : (isOwner ? '/owner' : `/student/search`);
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

    // 3. Navigate
    if (target) {
      nav(target);
    }
  };

  return (
    <div>
      <PageHeader title="Notifications" subtitle={`${unread} unread`} actions={<button onClick={markAll} disabled={unread === 0} className="btn-secondary text-sm">Mark all read</button>} />
      {loading ? (
        <div className="space-y-2">{Array.from({length:8}).map((_,i) => <div key={i} className="card h-20 animate-pulse bg-slate-100" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState title="No notifications" description="You'll see booking updates, PG verifications, and complaint updates here." icon="🔔" />
      ) : (
        <div className="card divide-y divide-slate-100 overflow-hidden">
          {items.map((n) => (
            <button
              key={n._id}
              onClick={() => handleNotifClick(n)}
              className={`w-full text-left p-4 flex gap-4 hover:bg-surface-50 transition ${!n.isRead ? 'bg-brand-50/30' : ''}`}
            >
              <div className="w-10 h-10 rounded-full bg-surface-100 flex items-center justify-center text-xl shrink-0">{iconFor(n.type)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800">{n.title}</span>
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />}
                </div>
                <p className="text-sm text-slate-600 mt-0.5">{n.body}</p>
                <div className="text-[11px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
