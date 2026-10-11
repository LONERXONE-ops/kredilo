import { Banknote, ClipboardCheck, LayoutDashboard, ListChecks, ScrollText, Settings, ShieldAlert, Users, Wallet, Landmark, UserPlus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const adminNav: { path: string; label: string; icon: LucideIcon }[] = [
  { path: '', label: 'Overview', icon: LayoutDashboard },
  { path: 'tasks', label: 'Tasks', icon: ListChecks },
  { path: 'submissions', label: 'Submissions', icon: ClipboardCheck },
  { path: 'users', label: 'Users', icon: Users },
  { path: 'withdrawals', label: 'Withdrawals', icon: Wallet },
  { path: 'funding', label: 'Funding', icon: Landmark },
  { path: 'ledger', label: 'Ledger', icon: Banknote },
  { path: 'fraud', label: 'Fraud', icon: ShieldAlert },
  { path: 'audit', label: 'Audit Log', icon: ScrollText },
  { path: 'settings', label: 'Settings', icon: Settings },
  { path: 'team', label: 'Team', icon: UserPlus },
];

export type Placeholder = { title: string; description: string; items: string[]; rule: string };

export const adminPlaceholders: Record<string, Placeholder> = {
  submissions: {
    title: 'Submissions',
    description: 'Review queue for tasks that need proof.',
    items: ['Queue of tasks awaiting verification, with filters', 'View the proof a user submitted', 'Approve: credits the reward through the ledger', 'Reject: a written reason is required', 'Full history per submission'],
    rule: 'Approving credits tokens only through the server ledger. Replaying an approval never credits twice.',
  },
  users: {
    title: 'Users',
    description: 'Find and manage accounts.',
    items: ['Search and list users', 'Account status and verification', 'Balance as calculated from the ledger', 'Suspend and reinstate accounts', 'View a user’s task and transaction activity'],
    rule: 'Admins cannot edit balances directly. Corrections are audited compensating ledger entries.',
  },
  withdrawals: {
    title: 'Withdrawals',
    description: 'Review withdrawal requests once payouts exist.',
    items: ['Queue by status: Requested, Processing, Paid, Failed', 'Payment provider status for each payout', 'Retry a failed payout safely', 'Release a reservation exactly once when a payout fails'],
    rule: 'A withdrawal is Paid only after a verified provider result. Real payouts stay disabled until the launch checklist on the Overview page is complete.',
  },
  ledger: {
    title: 'Ledger',
    description: 'Every balance-changing event in one place.',
    items: ['All token transactions with user, amount, reason, status and references', 'Filter by user, type, status and date', 'Reconciliation against the funding reserve', 'Export for audits'],
    rule: 'The ledger is append-only. Mistakes are fixed with compensating entries, never by editing or deleting.',
  },
  fraud: {
    title: 'Fraud review',
    description: 'Spot and handle abuse.',
    items: ['Duplicate or linked accounts', 'Unusually fast or repeated completions', 'Reused or edited proof', 'Accounts hitting limits repeatedly', 'Flag, hold rewards or suspend'],
    rule: 'Signals come from account and task behaviour only. No invasive device fingerprinting.',
  },
  audit: {
    title: 'Audit log',
    description: 'A permanent record of admin and financial actions.',
    items: ['Who did what, when, and to which record', 'Approvals, rejections, suspensions and setting changes', 'Funding and withdrawal actions', 'Filter by admin, action and date'],
    rule: 'Every admin and financial action is logged. Log entries cannot be edited or removed.',
  },
  settings: {
    title: 'Settings',
    description: 'Platform rules that admins may change.',
    items: ['Token conversion rate, kept as dated versions', 'Minimum withdrawal', 'Default daily limits and cooldowns', 'Maintenance mode and reward pause'],
    rule: 'A new rate applies to new rewards only. Existing balances keep the rate they were earned at.',
  },
};
