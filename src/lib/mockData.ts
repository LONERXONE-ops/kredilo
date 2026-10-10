export type TaskStatus = 'available' | 'in_progress' | 'awaiting_verification' | 'completed' | 'rejected';
export type TaskCategory = 'Social Media' | 'Surveys' | 'Apps & Sign Ups' | 'Content Creation' | 'Gaming' | 'Shopping & Offers' | 'Research & Reviews' | 'Other';

export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  reward: number;
  timeMinutes: number;
  description: string;
  requirements: string[];
  status: TaskStatus;
  requiresProof?: boolean;
  rejectionReason?: string;
}

export interface Transaction {
  id: string;
  date: string;
  type: 'Task Reward' | 'Game Reward' | 'Withdrawal' | 'Pending';
  description: string;
  amount: number;
  status: 'Completed' | 'Processing' | 'Failed' | 'Pending';
}

export interface User {
  id: string;
  name: string;
  email: string;
  tokens: number;
  pending: number;
  totalEarned: number;
}

// Mock data - clearly for demo/frontend development only
export const mockUser: User = {
  id: 'KRD74291',
  name: 'New User',
  email: 'user@example.com',
  tokens: 2450,
  pending: 1200,
  totalEarned: 3650,
};

export const mockTasks: Task[] = [
  { id: '1', title: 'Follow & Like Our Page', category: 'Social Media', reward: 500, timeMinutes: 5, description: 'Follow our official page and like the latest post. Take a screenshot as proof.', requirements: ['Follow page', 'Like post'], status: 'available', requiresProof: true },
  { id: '2', title: 'Brand Opinion Survey', category: 'Surveys', reward: 800, timeMinutes: 8, description: 'Share your opinion about our products and services.', requirements: ['Valid email', 'Complete survey'], status: 'available' },
  { id: '3', title: 'Watch & Share Video', category: 'Content Creation', reward: 600, timeMinutes: 10, description: 'Watch the short video and share it on your social media (optional).', requirements: ['Watch video', 'Share link'], status: 'available' },
  { id: '4', title: 'Play Snake Game', category: 'Gaming', reward: 400, timeMinutes: 5, description: 'Play the Snake game and reach a score of 50 or higher.', requirements: ['Play 1 round', 'Reach 50 score'], status: 'available' },
  { id: '5', title: 'Sign Up for Free Trial', category: 'Shopping & Offers', reward: 1200, timeMinutes: 15, description: 'Sign up for the free trial and complete the initial setup process.', requirements: ['Valid account', 'Complete sign up'], status: 'available', requiresProof: true },
  { id: '6', title: 'Product Review', category: 'Research & Reviews', reward: 900, timeMinutes: 12, description: 'Write a short review about the product and submit your proof.', requirements: ['Write review', 'Submit proof'], status: 'available', requiresProof: true },
];

export const mockTransactions: Transaction[] = [
  { id: 't1', date: 'Sep 13, 2026 14:32', type: 'Task Reward', description: 'Completed a short survey', amount: 200, status: 'Completed' },
  { id: 't2', date: 'Sep 13, 2026 12:17', type: 'Game Reward', description: 'Played Snake Game', amount: 100, status: 'Completed' },
  { id: 't3', date: 'Sep 12, 2026 18:45', type: 'Task Reward', description: 'Follow us on X (Twitter)', amount: 150, status: 'Completed' },
  { id: 't4', date: 'Sep 12, 2026 16:20', type: 'Withdrawal', description: 'Requested payout (USDT)', amount: -1000, status: 'Processing' },
  { id: 't5', date: 'Sep 11, 2026 11:03', type: 'Task Reward', description: 'Completed a short survey', amount: 300, status: 'Completed' },
];
