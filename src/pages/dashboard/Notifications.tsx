import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, ChevronRight } from 'lucide-react';
import { listNotifications, markRead, notificationHref, timeAgo } from '../../lib/notifications';
import type { Notification } from '../../lib/notifications';
import { EmptyState } from '../../components/EmptyState';

export default function Notifications() {
  const [items, setItems] = useState<Notification[] | null>(null);
  const [error, setError] = useState('');

  const load = () => listNotifications().then((r) => setItems(r.notifications)).catch((e) => setError(e instanceof Error ? e.message : 'Could not load notifications.'));
  useEffect(() => {
    void load();
    // Mark everything read once the page has been opened.
    markRead().then(() => window.dispatchEvent(new Event('notifications-read'))).catch(() => { /* ignore */ });
  }, []);

  const markAll = async () => {
    try { await markRead(); setItems((prev) => prev?.map((n) => ({ ...n, read: true })) ?? prev); window.dispatchEvent(new Event('notifications-read')); } catch { /* ignore */ }
  };

  const hasUnread = items?.some((n) => !n.read);

  // Shared inner layout for a notification, used by both the tappable (Link)
  // and non-tappable (div) variants.
  const Inner = ({ n, tappable }: { n: Notification; tappable: boolean }) => (
    <>
      <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-white/20' : 'bg-emerald-400'}`} />
      <div className="min-w-0 flex-1">
        <div className="font-bold">{n.title}</div>
        {n.body && <div className="mt-0.5 text-sm text-white/60">{n.body}</div>}
        <div className="mt-1 text-xs text-white/40">{timeAgo(n.createdAt)}</div>
      </div>
      {tappable && <ChevronRight size={18} className="mt-1 shrink-0 text-white/30" />}
    </>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-4xl font-extrabold">Notifications</h1>
        {hasUnread && (
          <button onClick={markAll} className="inline-flex items-center gap-1.5 text-sm font-bold text-white/60 hover:text-white">
            <CheckCheck size={16} /> Mark all read
          </button>
        )}
      </div>

      {error && <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      {!items && !error && <p className="rounded-3xl border border-white/10 p-8 text-center text-sm text-white/45">Loading...</p>}

      {items && items.length === 0 && (
        <EmptyState icon={Bell} title="You’re all caught up" text="Approvals, rejections and withdrawal updates will show up here as they happen." />
      )}

      <div className="space-y-3">
        {items?.map((n) => {
          const href = notificationHref(n);
          const base = `flex items-start gap-3 rounded-3xl border p-4 ${n.read ? 'border-white/10 bg-[#0e0e0e]' : 'border-white/20 bg-white/[0.04]'}`;
          return href ? (
            <Link key={n.id} to={href} className={`pressable ${base} transition hover:border-white/30 hover:bg-white/[0.07]`}>
              <Inner n={n} tappable />
            </Link>
          ) : (
            <div key={n.id} className={base}>
              <Inner n={n} tappable={false} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
