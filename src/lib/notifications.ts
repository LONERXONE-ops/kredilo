import { apiRequest } from './auth';

export type Notification = {
  id: string; type: string; title: string; body: string | null;
  refType: string | null; refId: string | null; read: boolean; createdAt: string;
};

export const listNotifications = () => apiRequest<{ notifications: Notification[]; unread: number }>('/api/notifications');
export const getUnreadCount = () => apiRequest<{ unread: number }>('/api/notifications/unread').then((r) => r.unread);
export const markRead = (id?: string) => apiRequest<{ unread: number }>('/api/notifications/read', id ? { id } : {});

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
