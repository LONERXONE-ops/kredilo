import { apiRequest } from './auth';

export type Overview = {
  users: number; admins: number; liveTasks: number; pendingReviews: number;
  pendingPosts: number; openWithdrawals: number; reserveTokens: number; reserveNaira: number; reserveLow: boolean;
};
export type AdminUser = { id: string; email: string; role: string; status: string; emailVerified: boolean; balance: number; createdAt: string; avatar: string | null };
export type Funding = {
  rate: { tokens: number; naira: number };
  fundedTokens: number; fundedNaira: number; issuedTokens: number; issuedNaira: number;
  availableTokens: number; availableNaira: number; heldForWithdrawalTokens: number; heldForWithdrawalNaira: number;
};
export type LedgerEntry = { amount: number; reason: string; refType: string | null; email: string; at: string };
export type AuditEntry = { action: string; target: string | null; meta: string | null; actor: string | null; at: string };
export type Fraud = { reusedScreenshots: number; reusedHandles: { handle: string; accounts: number }[]; notReceivedCount: number };

export const getOverview = () => apiRequest<Overview>('/api/admin/overview');
export const getUsers = (q?: string) => apiRequest<{ users: AdminUser[] }>(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`).then((r) => r.users);
export const setUserStatus = (userId: string, suspend: boolean) => apiRequest('/api/admin/users/status', { userId, suspend });
export const getFunding = () => apiRequest<Funding>('/api/admin/funding');
export const addFunding = (tokens: number) => apiRequest<{ availableTokens: number; availableNaira: number }>('/api/admin/funding', { tokens });
export const setExchangeRate = (kreds: number, naira: number) => apiRequest<{ rate: { tokens: number; naira: number } }>('/api/admin/rate', { kreds, naira });
export const getLedger = () => apiRequest<{ entries: LedgerEntry[] }>('/api/admin/ledger').then((r) => r.entries);
export const getAudit = () => apiRequest<{ entries: AuditEntry[] }>('/api/admin/audit').then((r) => r.entries);
export const getFraud = () => apiRequest<Fraud>('/api/admin/fraud');
