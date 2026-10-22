import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, ChevronRight, X } from 'lucide-react';
import { listNotifications, markRead, notificationHref, timeAgo } from '../../lib/notifications';
import type { Notification } from '../../lib/notifications';
import { EmptyState } from '../../components/EmptyState';

export default function Notifications() {
  const [items, setItems] = useState<Notification[] | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Notification | null>(null);

  const load = () => listNotifications().then((r) => setItems(r.notifications)).catch((e) => setError(e instanceof Error ? e.message : 'Could not load notifications.'));
  useEffect(() => {
    void load();
    // Mark everything read once the page has been opened.
    markRead().then(() => window.dispatchEvent(new Event('notifications-read'))).catch(() => { /* ignore */ });
  }, []);

  const markAll = async () => {
    try { await markRead(); setItems((prev) => prev?.map((n) => ({ ...n, read: true })) ?? prev); window.dispatchEvent(new Event('notifications-read')); } catch { /* ignore */ }
  };

  const openDetail = (n: Notification) => {
    setSelected(n);
    if (!n.read) { setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, read: true } : x)) ?? prev); markRead(n.id).catch(() => { /* ignore */ }); }
  };

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selected]);

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
          const base = `flex w-full items-start gap-3 rounded-3xl border p-4 text-left ${n.read ? 'border-white/10 bg-[#0e0e0e]' : 'border-white/20 bg-white/[0.04]'}`;
          return (
            <button key={n.id} onClick={() => openDetail(n)} className={`pressable ${base} transition hover:border-white/30 hover:bg-white/[0.07]`}>
              <Inner n={n} tappable />
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 p-4 backdrop-blur-sm animate-[fadein_160ms_ease-out] sm:items-center" onClick={() => setSelected(null)}>
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0e0e0e] p-6 shadow-2xl animate-[popin_240ms_ease-out]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-extrabold leading-snug">{selected.title}</h2>
              <button onClick={() => setSelected(null)} aria-label="Close" className="pressable flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/60 hover:bg-white/10"><X size={18} /></button>
            </div>
            <div className="mt-1 text-xs text-white/40">{timeAgo(selected.createdAt)}</div>
            {selected.image && <img src={`/api/uploads?file=${encodeURIComponent(selected.image)}`} alt="" className="mt-4 w-full rounded-2xl object-cover" />}
            {selected.body && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-white/75">{selected.body}</p>}
            {notificationHref(selected) && (
              <Link to={notificationHref(selected)!} onClick={() => setSelected(null)} className="pressable mt-5 flex min-h-12 items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black hover:bg-white/90">View details <ChevronRight size={16} /></Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
