import { CircleDashed, KeyRound } from 'lucide-react';

const stats = ['Users', 'Tasks', 'Pending reviews', 'Withdrawal requests'];

const checklist = [
  'Reserve ledger (funding, liabilities, fees, payouts)',
  'Auditable server-side token ledger',
  'Real payment provider integration',
  'Secure payout start and provider status checks',
  'Failure, retry, reconciliation, duplicate and refund handling',
  'Atomic balance reservation and concurrency protection',
  'Admin controls and audit logs',
  'End-to-end testing',
];

const access = [
  'Admin accounts are never created through public sign-up.',
  'The first admin is created on the server by the owner, using a private command and private settings, not anything in the website code.',
  'Every admin request is checked on the server for a valid session and an admin role. Hiding buttons is not security.',
  'Admin sessions will be short, rate-limited, and later protected with two-step login.',
  'Roles planned: Owner (everything, including funding and settings), Reviewer (submissions only), Support (read-only users).',
  'Every admin action is written to the audit log.',
];

export default function AdminOverview() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-extrabold">Admin</h1>
        <p className="mt-1 text-white/55">Overview of operations. Numbers appear once the backend is connected.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s} className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5">
            <div className="text-sm font-semibold text-white/50">{s}</div>
            <div className="mt-1 text-3xl font-extrabold">—</div>
            <div className="mt-1 text-xs text-white/40">Not connected</div>
          </div>
        ))}
      </div>

      <section className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5 sm:p-6">
        <h2 className="text-xl font-extrabold">Launch readiness: real payouts</h2>
        <p className="mt-1 text-sm text-white/55">Real cash withdrawals stay off until every item below is built and tested.</p>
        <ul className="mt-4 space-y-2.5">
          {checklist.map((c) => (
            <li key={c} className="flex items-start gap-3 text-sm">
              <CircleDashed size={18} className="mt-0.5 shrink-0 text-white/40" />
              <span className="flex-1">{c}</span>
              <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-white/60">Not done</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-xl font-extrabold"><KeyRound size={20} /> How admins get access</h2>
        <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-white/70">
          {access.map((a) => <li key={a} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/50" />{a}</li>)}
        </ul>
      </section>
    </div>
  );
}
