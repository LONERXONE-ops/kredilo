// API service layer - placeholder for backend integration
// Replace mock implementations with real fetch calls

import { CONFIG } from './config';

export const api = {
  auth: {
    login: async (email: string, password: string) => {
      // TODO: POST /api/auth/login
      console.log('Demo login', email);
      return { success: true, token: 'demo-token', user: { id: 'KRD74291', name: 'New User' } };
    },
    signup: async (email: string, password: string) => {
      // TODO: POST /api/auth/signup
      return { success: true };
    },
  },
  tasks: {
    list: async () => {
      // TODO: GET /api/tasks
      const { mockTasks } = await import('./mockData');
      return mockTasks;
    },
    submit: async (taskId: string, proof?: string) => {
      // TODO: POST /api/tasks/:id/submit
      return { success: true, status: 'awaiting_verification' };
    },
  },
  wallet: {
    getBalance: async () => {
      // TODO: GET /api/wallet
      return { available: 2450, pending: 1200 };
    },
    requestWithdrawal: async (amount: number, method: string) => {
      // TODO: POST /api/withdrawals
      if (amount < CONFIG.MIN_WITHDRAWAL_TOKENS) throw new Error('Below minimum');
      return { success: true, status: 'processing', id: 'wd-demo' };
    },
  },
};
