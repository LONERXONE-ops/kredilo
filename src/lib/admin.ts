import { apiRequest } from './auth';

export type AdminTask = {
  id: string; title: string; category: string; reward: number; proofType: string;
  needsHandle: boolean; remaining: number; maxCompletions: number; approvedCount: number; status: string;
};
export type PendingSubmission = {
  id: string; taskId: string; title: string; reward: number; handle: string | null;
  proofFile: string | null; proofText: string | null; submittedAt: string | null;
};

export const createTask = (body: {
  title: string; description: string; category: string; reward: number; proofType: string; needsHandle: boolean; maxCompletions: number;
}) => apiRequest<{ task: AdminTask }>('/api/admin/tasks', body);

export const listPendingSubmissions = () => apiRequest<{ submissions: PendingSubmission[] }>('/api/admin/submissions').then((r) => r.submissions);
export const approveSubmission = (submissionId: string) => apiRequest('/api/admin/submissions/approve', { submissionId });
export const rejectSubmission = (submissionId: string, reason: string) => apiRequest('/api/admin/submissions/reject', { submissionId, reason });
