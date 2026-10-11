import { apiRequest } from './auth';

export type MyWithdrawal = {
  id: string; amountTokens: number; amountNaira: number; status: 'requested' | 'processing' | 'paid' | 'cancelled';
  bankName: string; accountLast4: string; transferRef: string | null; adminNote: string | null; notReceived: boolean;
  createdAt: string; updatedAt: string;
};
export type WithdrawalState = { open: boolean; opensAt: string | null; hasOpenRequest: boolean; withdrawals: MyWithdrawal[] };
export type AdminWithdrawal = {
  id: string; email: string; amountTokens: number; amountNaira: number; status: string; bankName: string;
  accountName: string; accountNumber: string; transferRef: string | null; adminNote: string | null; notReceived: boolean; createdAt: string;
};

export const getWithdrawals = () => apiRequest<WithdrawalState>('/api/withdrawals');
export const requestWithdrawal = (body: { bankName: string; accountName: string; accountNumber: string; amountTokens: number }) =>
  apiRequest<{ id: string }>('/api/withdrawals/request', body);
export const flagNotReceived = (id: string) => apiRequest('/api/withdrawals/not-received', { id });

export const listAdminWithdrawals = (status?: string) => apiRequest<{ withdrawals: AdminWithdrawal[] }>(`/api/admin/withdrawals${status ? `?status=${status}` : ''}`).then((r) => r.withdrawals);
export const setProcessing = (id: string) => apiRequest('/api/admin/withdrawals/processing', { id });
export const markPaid = (id: string, transferRef: string) => apiRequest('/api/admin/withdrawals/paid', { id, transferRef });
export const cancelWithdrawal = (id: string, reason: string, returnTokens: boolean) => apiRequest('/api/admin/withdrawals/cancel', { id, reason, returnTokens });
export const getWithdrawalSettings = () => apiRequest<{ opensAt: string | null; isOpen: boolean }>('/api/admin/withdrawals/settings');
export const setWithdrawalOpen = (opensAt: string | null) => apiRequest<{ opensAt: string | null }>('/api/admin/withdrawals/settings', { opensAt });

export const wStatusLabel: Record<string, string> = {
  requested: 'Requested', processing: 'Processing', paid: 'Sent by Kredilo', cancelled: 'Cancelled',
};
