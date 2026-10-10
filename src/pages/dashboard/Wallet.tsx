import { useSearchParams } from 'react-router-dom';
import { Clock, Info, Lock } from 'lucide-react';
import { mockTransactions, mockUser } from '../../lib/mockData';
import { CONFIG, formatNaira, formatTokens, tokensToNaira } from '../../lib/config';
import { Tabs } from '../../components/Tabs';

type Tab = 'overview' | 'withdraw' | 'transactions';

const naira = (tokens: number) => formatNaira(Number(tokensToNaira(tokens)));

function Overview({ goto }: { goto: (t: Tab) => void }) {
  const pct = Math.min(100, (mockUser.tokens / CONFIG.MIN_WITHDRAWAL_TOKENS) * 100);
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-6">
        <div className="text-sm font-semibold text-white/50">Available Balance (demo)</div>
        <div className="mt-1 text-5xl font-extrabold">{formatTokens(mockUser.tokens)}</div>
        <div className="mt-1 text-sm text-white/45">≈ {naira(mockUser.tokens)} ({CONFIG.TOKENS_PER_NAIRA} tokens = ₦1, provisional rate)</div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-white/70" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 text-xs text-white/45">
          {formatTokens(mockUser.tokens)} / {formatTokens(CONFIG.MIN_WITHDRAWAL_TOKENS)} tokens toward the minimum withdrawal amount
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5">
          <div className="text-sm font-semibold text-white/50">Pending Rewards</div>
          <div className="mt-1 text-2xl font-extrabold">{formatTokens(mockUser.pending)}</div>
          <div className="text-xs text-white/40">≈ {naira(mockUser.pending)}</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5">
          <div className="text-sm font-semibold text-white/50">Total Earned</div>
          <div className="mt-1 text-2xl font-extrabold">{formatTokens(mockUser.totalEarned)}</div>
          <div className="text-xs text-white/40">≈ {naira(mockUser.totalEarned)}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => goto('withdraw')} className="min-h-14 rounded-full border border-white/20 text-sm font-bold hover:bg-white/5">Withdraw</button>
        <button onClick={() => goto('transactions')} className="min-h-14 rounded-full border border-white/20 text-sm font-bold hover:bg-white/5">View Transactions</button>
      </div>
    </div>
  );
}

function Withdraw() {
  const pct = Math.min(100, (mockUser.tokens / CONFIG.MIN_WITHDRAWAL_TOKENS) * 100);
  const steps = [
    ['Requested', 'You ask to withdraw. The tokens are set aside for you.'],
    ['Processing', 'The payment is being sent and checked.'],
    ['Paid', 'Shown only after the payment is confirmed.'],
    ['Failed', 'If a payment fails, your tokens go back to your balance.'],
  ];
  return (
    <div className="space-y-4">
      <div className="flex gap-3 rounded-3xl border border-white/15 bg-white/[0.04] p-5">
        <Lock size={22} className="mt-0.5 shrink-0" />
        <div>
          <div className="font-extrabold">Withdrawals are not available yet</div>
          <p className="mt-1 text-sm leading-relaxed text-white/60">
            Kredilo is in demo mode and does not send real money. Cash withdrawals will only open after secure payments and funding checks are complete. Nothing on this page moves any money.
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-6">
        <div className="text-sm font-semibold text-white/50">Minimum withdrawal</div>
        <div className="mt-1 text-2xl font-extrabold">{formatTokens(CONFIG.MIN_WITHDRAWAL_TOKENS)} tokens = {formatNaira(CONFIG.MIN_WITHDRAWAL_NAIRA)}</div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-white/70" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 text-xs text-white/45">Demo balance: {formatTokens(mockUser.tokens)} tokens</div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-6">
        <h3 className="mb-4 font-extrabold">How withdrawals will work</h3>
        <ol className="space-y-4">
          {steps.map(([title, text], i) => (
            <li key={title} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-extrabold">{i + 1}</span>
              <div>
                <div className="font-bold">{title}</div>
                <div className="text-sm text-white/55">{text}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <button disabled className="min-h-14 w-full cursor-not-allowed rounded-full bg-white/10 text-sm font-bold text-white/40">
        Withdrawals unavailable
      </button>
    </div>
  );
}

function Transactions() {
  const chip = (s: string) =>
    s === 'Completed' ? 'bg-emerald-500/15 text-emerald-400' : s === 'Failed' ? 'bg-red-500/15 text-red-400' : 'bg-white/10 text-white/70';
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-white/45"><Info size={14} /> Demo transactions for illustration only.</div>
      {mockTransactions.map((t) => (
        <div key={t.id} className="flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-[#0e0e0e] p-4">
          <div className="min-w-0">
            <div className="truncate font-bold">{t.description}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-white/45">
              <span>{t.type}</span>
              <span className="flex items-center gap-1"><Clock size={11} /> {t.date}</span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-extrabold">{t.amount > 0 ? '+' : ''}{t.amount} tokens</div>
            <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${chip(t.status)}`}>{t.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Wallet() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: Tab = raw === 'withdraw' || raw === 'transactions' ? raw : 'overview';
  const setTab = (t: Tab) => setParams(t === 'overview' ? {} : { tab: t }, { replace: true });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-4xl font-extrabold">Wallet</h1>
        <p className="mt-1 text-white/55">Your token balance, withdrawals and transaction history.</p>
      </div>
      <Tabs
        tabs={[
          { id: 'overview' as Tab, label: 'Overview' },
          { id: 'withdraw' as Tab, label: 'Withdraw' },
          { id: 'transactions' as Tab, label: 'Transactions' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'overview' && <Overview goto={setTab} />}
      {tab === 'withdraw' && <Withdraw />}
      {tab === 'transactions' && <Transactions />}
    </div>
  );
}
