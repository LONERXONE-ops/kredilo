import { apiRequest } from './auth';

export type Task = {
  id: string; kind: 'admin' | 'posted'; title: string; description: string; category: string;
  reward: number; proofType: 'screenshot' | 'link' | 'text' | 'none'; needsHandle: boolean;
  photo: string | null; link: string | null; status: string; remaining: number; maxCompletions: number; approvedCount: number;
};
export type MySubmission = {
  id: string; taskId: string; title: string; reward: number; proofType: string;
  status: 'in_progress' | 'pending_review' | 'approved' | 'rejected'; rejectReason: string | null; submittedAt: string | null;
};
export type Wallet = {
  balanceTokens: number; balanceNaira: number; rate: { tokens: number; naira: number };
  minWithdrawalTokens: number; minWithdrawalNaira: number;
  tasksThisCycle: number; tasksTotal: number;
  transactions: { amount: number; reason: string; refType: string | null; refId: string | null; at: string }[];
};

export const listTasks = () => apiRequest<{ tasks: Task[] }>('/api/tasks').then((r) => r.tasks);
export const listMySubmissions = () => apiRequest<{ submissions: MySubmission[] }>('/api/tasks/mine').then((r) => r.submissions);
export const acceptTask = (taskId: string) => apiRequest('/api/tasks/accept', { taskId });
export const submitTask = (body: { taskId: string; image?: string; text?: string; handle?: string }) => apiRequest<{ status: string }>('/api/tasks/submit', body);
export const getWallet = () => apiRequest<Wallet>('/api/wallet');

// Resize + compress an image file to a small JPEG data URL before upload (keeps phone uploads light).
export function fileToDataUrl(file: File, maxDim = 1280, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a valid image.'));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Could not process the image.'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export const statusLabel: Record<MySubmission['status'], string> = {
  in_progress: 'In Progress',
  pending_review: 'Pending confirmation',
  approved: 'Completed',
  rejected: 'Rejected',
};
