import { apiRequest } from './auth';

export type FollowStatus = { bonus: number; platforms: string[]; claimed: string[] };

export const getFollowStatus = () => apiRequest<FollowStatus>('/api/follow/status');
export const claimFollow = (platform: string) => apiRequest<{ already: boolean; kreds?: number; claimed: string[] }>('/api/follow/claim', { platform });
