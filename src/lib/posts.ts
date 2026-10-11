import { apiRequest } from './auth';

export type PriceOption = { days: number; price_naira: number; reward_tokens: number };
export type PostPricing = {
  options: PriceOption[];
  categories: string[];
  payTo: { bankName: string; accountName: string; accountNumber: string };
};
export type PostedTask = {
  id: string; title: string; description: string; category: string; reward: number; needsHandle: boolean;
  photo: string | null; days: number | null; priceNaira: number | null; maxCompletions: number;
  approvedCount: number; status: string; paymentNote: string | null; expiresAt: string | null;
};
export type Doer = { id: string; status: string; handle: string | null; proofFile: string | null; submittedAt: string | null };
export type AdminPost = {
  id: string; title: string; description: string; category: string; reward: number; maxCompletions: number;
  days: number | null; priceNaira: number | null; pool: number; photo: string | null; receipt: string | null; createdAt: string;
};

export const getPostPricing = () => apiRequest<PostPricing>('/api/post/pricing');
export const createPost = (body: { title: string; description: string; category: string; days: number; maxCompletions: number; needsHandle: boolean; photo: string; receipt: string }) =>
  apiRequest<{ id: string; status: string; priceNaira: number; reward: number; pool: number }>('/api/post/create', body);
export const listMyPosts = () => apiRequest<{ tasks: PostedTask[] }>('/api/post/mine').then((r) => r.tasks);
export const getPostDoers = (taskId: string) => apiRequest<{ ongoing: Doer[]; completed: Doer[] }>(`/api/post/doers?taskId=${encodeURIComponent(taskId)}`);

export const listAdminPosts = () => apiRequest<{ posts: AdminPost[] }>('/api/admin/posts').then((r) => r.posts);
export const confirmPost = (taskId: string, note: string) => apiRequest('/api/admin/posts/confirm', { taskId, note });
export const rejectPost = (taskId: string, note: string) => apiRequest('/api/admin/posts/reject', { taskId, note });

export const postStatusLabel: Record<string, string> = {
  pending_payment: 'Awaiting payment confirmation',
  live: 'Live',
  closed: 'Finished',
  rejected: 'Rejected',
};
