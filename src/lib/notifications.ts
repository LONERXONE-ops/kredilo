import { apiRequest } from './auth';

export type Notification = {
  id: string; type: string; title: string; body: string | null;
  refType: string | null; refId: string | null; image: string | null; read: boolean; createdAt: string;
};

export const listNotifications = () => apiRequest<{ notifications: Notification[]; unread: number }>('/api/notifications');
export const getUnreadCount = () => apiRequest<{ unread: number }>('/api/notifications/unread').then((r) => r.unread);
export const markRead = (id?: string) => apiRequest<{ unread: number }>('/api/notifications/read', id ? { id } : {});

// Where a notification should take the user when tapped. null = not tappable
// (e.g. broadcast announcements, which have no target).
export function notificationHref(n: Notification): string | null {
  switch (n.type) {
    case 'task_approved':
      // The task is usually gone once completed — send them to their earnings.
      return '/dashboard/wallet';
    case 'task_rejected':
      // Still live for a resubmit in most cases.
      return n.refId ? `/dashboard/tasks/${n.refId}` : '/dashboard/wallet';
    case 'referral_bonus':
      return '/dashboard/profile';
    case 'post_submission':
    case 'post_live':
    case 'post_rejected':
      return '/dashboard/post';
    case 'withdrawal_paid':
    case 'withdrawal_cancelled':
      return '/dashboard/wallet';
    default:
      return null;
  }
}

// Short relative time like "3h ago", "2d ago", "just now".
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
