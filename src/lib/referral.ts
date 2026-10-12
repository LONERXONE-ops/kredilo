import { apiRequest } from './auth';

export type ReferralInfo = { code: string; count: number; credited: number; earned: number; bonus: number };

export const getReferral = () => apiRequest<ReferralInfo>('/api/referral');
