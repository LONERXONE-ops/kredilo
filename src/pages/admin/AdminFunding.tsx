import { CONFIG, FUNDING_PLAN, formatNaira } from '../../lib/config';

const plan = [
  { label: 'Approved launch ceiling', value: formatNaira(FUNDING_PLAN.LAUNCH_CEILING_NAIRA), note: 'Planning limit. Not increased or topped up automatically.' },
  { label: 'Reward reserve (planned)', value: formatNaira(FUNDING_PLAN.REWARD_RESERVE_NAIRA), note: 'The only part that may fund rewards.' },
  { label: 'Fees and contingency', value: formatNaira(FUNDING_PLAN.FEES_CONTINGENCY_NAIRA), note: 'Not spendable on rewards.' },
];

const live = ['Funding actually received', 'Outstanding reward liabilities', 'Withdrawal reservations', 'Confirmed payouts', 'Available to issue as rewards', 'Reconciliation differences'];

export default function AdminFunding() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-extrabold">Funding &amp; reserve</h1>
        <p className="mt-1 max-w-xl text-white/55">What can safely be promised as rewards. These plan figures are not proof that money has been deposited.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {plan.map((p) => (
          <div key={p.label} className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5">
            <div className="text-sm font-semibold text-white/50">{p.label}</div>
            <div className="mt-1 text-3xl font-extrabold">{p.value}</div>
            <div className="mt-1 text-xs text-white/40">{p.note}</div>
          </div>
        ))}
      </div>

      <section className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5 sm:p-6">
        <h2 className="text-xl font-extrabold">Live reserve</h2>
        <p className="mt-1 text-sm text-white/55">Calculated from the ledger once the backend exists. Nothing is recorded yet.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {live.map((l) => (
            <div key={l} className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3 text-sm">
              <span>{l}</span>
              <span className="font-extrabold text-white/40">—</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-white/60">
          Available to issue = funding received for rewards, minus rewards owed to users, minus tokens reserved for withdrawals, minus confirmed payouts. When it reaches zero, new rewards stop.
        </p>
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5 text-sm leading-relaxed text-white/65 sm:p-6">
        Conversion rate: {CONFIG.TOKENS_PER_NAIRA} tokens = ₦1 (provisional). Minimum withdrawal: {CONFIG.MIN_WITHDRAWAL_TOKENS.toLocaleString()} tokens = {formatNaira(CONFIG.MIN_WITHDRAWAL_NAIRA)}. Rate changes will be stored as dated versions so old balances keep their value.
      </section>
    </div>
  );
}
