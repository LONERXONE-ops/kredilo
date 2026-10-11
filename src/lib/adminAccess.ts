// Which admin sections each role can see. This only controls what the screen shows.
// The server is what actually enforces who can do what.
export type AdminRole = 'owner' | 'reviewer' | 'support';

const everyone: AdminRole[] = ['owner', 'reviewer', 'support'];

export const sectionRoles: Record<string, AdminRole[]> = {
  '': everyone,
  tasks: ['owner'],
  payments: ['owner'],
  submissions: ['owner', 'reviewer'],
  users: ['owner', 'support'],
  withdrawals: ['owner'],
  funding: ['owner'],
  ledger: ['owner'],
  fraud: ['owner', 'reviewer'],
  audit: ['owner'],
  settings: ['owner'],
  team: ['owner'],
};

export const canSee = (role: string, section: string): boolean => (sectionRoles[section] ?? ['owner']).includes(role as AdminRole);
