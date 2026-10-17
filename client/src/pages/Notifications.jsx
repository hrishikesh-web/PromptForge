import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Heart, MessageSquare, Star, UserPlus, Flag } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { formatRelative } from '../utils/format';

const ICONS = {
  like: [Heart, 'text-rose-300'],
  comment: [MessageSquare, 'text-brand-300'],
  rating: [Star, 'text-amber-300'],
  follow: [UserPlus, 'text-violet-300'],
  report: [Flag, 'text-amber-300']
};

const linkFor = (n) => (n.entity_type === 'prompt' ? `/prompts/${n.entity_id}` : n.entity_type === 'user' ? `/creators/${n.entity_id}` : null);

export const Notifications = () => {
  const { notifications, loading, fetchNotifications, markRead, markAllRead, unreadCount } = useNotifications();

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-2xl space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-slate-400">Likes, ratings, comments and new followers on your prompts.</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-secondary !py-1.5">
            Mark all as read
          </button>
        )}
      </header>

      {loading && notifications.length === 0 ? (
        <LoadingState message="Loading notifications…" />
      ) : notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications yet" description="When people like, rate or comment on your prompts, you'll see it here." />
      ) : (
        <ul className="panel divide-y divide-slate-800/70">
          {notifications.map((n) => {
            const [Icon, tone] = ICONS[n.type] || [Bell, 'text-slate-400'];
            const href = linkFor(n);
            const unread = !n.is_read;
            const body = (
              <>
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${tone}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${unread ? 'text-white' : 'text-slate-400'}`}>{n.message}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{formatRelative(n.created_at)}</p>
                </div>
                {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-400" aria-label="Unread" />}
              </>
            );
            return (
              <li key={n.notification_id}>
                {href ? (
                  <Link to={href} onClick={() => unread && markRead(n.notification_id)} className="flex gap-3 px-4 py-3.5 hover:bg-slate-900/60">
                    {body}
                  </Link>
                ) : (
                  <button onClick={() => unread && markRead(n.notification_id)} className="flex w-full gap-3 px-4 py-3.5 text-left hover:bg-slate-900/60">
                    {body}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
