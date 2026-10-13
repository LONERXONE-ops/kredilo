import { apiRequest } from './auth';
export type StreakStatus = { streak: number; claimedToday: boolean; todayReward: number; cap: number };
export const getStreak = () => apiRequest<StreakStatus>('/api/streak/status');
export const claimStreak = () => apiRequest<{ already: boolean; streak: number; kreds?: number }>('/api/streak/claim', {});
