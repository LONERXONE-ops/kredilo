import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clock, Info, Lock } from 'lucide-react';
import { getWallet } from '../../lib/tasks';
import type { Wallet as WalletData } from '../../lib/tasks';
import { Tabs } from '../../components/Tabs';

type Tab = 'overview' | 'withdraw' | 'transactions';

const reasonLabel: Record<string, string> = {
  task_reward: 'Task reward',
  withdrawal_hold: 'Withdrawal requested',
  withdrawal_release: 'Withdrawal returned',
  admin_adjust: 'Adjustment',
};

function Overview({ w, goto }: { w: WalletData; goto: (t: Tab) => void }) {
  const pct = Math.min(100, (w.balanceTokens / w.minWithdrawalTokens) * 100);
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-6">
        <div className="text-sm font-semibold text-white/50">Available Balance</div>
        <div className="mt-1 text-5xl font-extrabold">{w.balanceTokens.toLocaleString()}</div>
        <div className="mt-1 text-sm text-white/45">≈ ₦{w.balanceNaira.toLocaleString()} ({w.rate.tokens} tokens = ₦{w.rate.naira})</div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-white/70" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 text-xs text-white/45">
          {w.balanceTokens.toLocaleString()} / {w.minWithdrawalTokens.toLocaleString()} tokens toward the minimum withdrawal
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => goto('withdraw')} className="min-h-14 rounded-full border border-white/20 text-sm font-bold hover:bg-white/5">Withdraw</button>
        <button onClick={() => goto('transactions')} className="min-h-14 rounded-full border border-white/20 text-sm font-bold hover:bg-white/5">View Transactions</button>
      </div>
    </div>
  );
}

function Withdraw({ w }: { w: WalletData }) {
  const pct = Math.min(100, (w.balanceTokens / w.minWithdrawalTokens) * 100);
  const steps = [
    ['Requested', 'You ask to withdraw. The tokens are set aside for you.'],
    ['Processing', 'An admin is sending the transfer and checking it.'],
    ['Paid', 'Shown only after the transfer is confirmed sent.'],
    ['Failed / Cancelled', 'Your tokens go back to your balance.'],
  ];
  return (
    <div className="space-y-4">
      <div className="flex gap-3 rounded-3xl border border-white/15 bg-white/[0.04] p-5">
        <Lock size={22} className="mt-0.5 shrink-0" />
        <div>
          <div className="font-extrabold">Withdrawals are not open yet</div>
          <p className="mt-1 text-sm leading-relaxed text-white/60">
            Payouts are sent by hand as bank transfers once withdrawals go live. Nothing on this page moves any money yet.
          </p>
        </div>
      </div>
      <div className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-6">
        <div className="text-sm font-semibold text-white/50">Minimum withdrawal</div>
        <div className="mt-1 text-2xl font-extrabold">{w.minWithdrawalTokens.toLocaleString()} tokens = ₦{w.minWithdrawalNaira.toLocaleString()}</div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-white/70" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 text-xs text-white/45">Your balance: {w.balanceTokens.toLocaleString()} tokens</div>
      </div>
      <div className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-6">
        <h3 className="mb-4 font-extrabold">How withdrawals will work</h3>
        <ol className="space-y-4">
          {steps.map(([title, text], i) => (
            <li key={title} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-extrabold">{i + 1}</span>
              <div><div className="font-bold">{title}</div><div className="text-sm text-white/55">{text}</div></div>
            </li>
          ))}
        </ol>
      </div>
      <button disabled className="min-h-14 w-full cursor-not-allowed rounded-full bg-white/10 text-sm font-bold text-white/40">Withdrawals unavailable</button>
    </div>
  );
}

function Transactions({ w }: { w: WalletData }) {
  if (w.transactions.length === 0) return <p className="rounded-3xl border border-white/10 p-8 text-center text-sm text-white/45">No transactions yet. Complete a task to earn tokens.</p>;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-white/45"><Info size={14} /> Your most recent transactions.</div>
      {w.transactions.map((t, i) => (
        <div key={i} className="flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-[#0e0e0e] p-4">
          <div className="min-w-0">
            <div className="truncate font-bold">{reasonLabel[t.reason] ?? t.reason}</div>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-white/45"><Clock size={11} /> {new Date(t.at).toLocaleString()}</div>
          </div>
          <div className={`shrink-0 font-extrabold ${t.amount > 0 ? 'text-emerald-400' : 'text-white/80'}`}>{t.amount > 0 ? '+' : ''}{t.amount} tokens</div>
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

  const [w, setW] = useState<WalletData | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    getWallet().then(setW).catch((e) => setError(e instanceof Error ? e.message : 'Could not load your wallet.'));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-4xl font-extrabold">Wallet</h1>
        <p className="mt-1 text-white/55">Your token balance, withdrawals and transaction history.</p>
      </div>
      <Tabs
        tabs={[{ id: 'overview' as Tab, label: 'Overview' }, { id: 'withdraw' as Tab, label: 'Withdraw' }, { id: 'transactions' as Tab, label: 'Transactions' }]}
        value={tab}
        onChange={setTab}
      />
      {error && <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      {!w && !error && <p className="rounded-3xl border border-white/10 p-8 text-center text-sm text-white/45">Loading...</p>}
      {w && tab === 'overview' && <Overview w={w} goto={setTab} />}
      {w && tab === 'withdraw' && <Withdraw w={w} />}
      {w && tab === 'transactions' && <Transactions w={w} />}
    </div>
  );
}
