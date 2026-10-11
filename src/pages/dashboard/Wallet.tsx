import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clock, Info, Loader2, Lock } from 'lucide-react';
import { getWallet } from '../../lib/tasks';
import type { Wallet as WalletData } from '../../lib/tasks';
import { Tabs } from '../../components/Tabs';
import { flagNotReceived, getWithdrawals, requestWithdrawal, wStatusLabel } from '../../lib/withdrawals';
import type { MyWithdrawal, WithdrawalState } from '../../lib/withdrawals';

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
  const [state, setState] = useState<WithdrawalState | null>(null);
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState(String(w.minWithdrawalTokens));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => { getWithdrawals().then(setState).catch(() => setState(null)); }, []);
  useEffect(load, [load]);

  const field = 'h-12 w-full rounded-2xl border border-white/15 bg-black/40 px-4 text-sm outline-none focus:border-white/40';
  const naira = (tokens: number) => Math.floor((tokens * w.rate.naira) / w.rate.tokens);

  const submit = async () => {
    setBusy(true); setError('');
    try {
      await requestWithdrawal({ bankName, accountName, accountNumber, amountTokens: Number(amount) });
      setAccountName(''); setAccountNumber('');
      load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not submit your request.'); }
    finally { setBusy(false); }
  };

  const flag = async (id: string) => { try { await flagNotReceived(id); load(); } catch { /* ignore */ } };

  if (!state) return <p className="rounded-3xl border border-white/10 p-8 text-center text-sm text-white/45">Loading...</p>;

  const chip = (st: string) => st === 'paid' ? 'bg-emerald-500/15 text-emerald-400' : st === 'cancelled' ? 'bg-red-500/15 text-red-300' : 'bg-amber-400/15 text-amber-300';
  const history = (wd: MyWithdrawal) => (
    <div key={wd.id} className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-extrabold">{wd.amountTokens.toLocaleString()} tokens → ₦{wd.amountNaira.toLocaleString()}</div>
          <div className="mt-0.5 text-xs text-white/45">{wd.bankName} ••••{wd.accountLast4} · {new Date(wd.createdAt).toLocaleDateString()}</div>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${chip(wd.status)}`}>{wStatusLabel[wd.status]}</span>
      </div>
      {wd.status === 'paid' && wd.transferRef && <div className="mt-2 text-xs text-white/55">Transfer ref: {wd.transferRef}</div>}
      {wd.status === 'cancelled' && wd.adminNote && <div className="mt-2 text-sm text-red-400">Reason: {wd.adminNote}</div>}
      {wd.status === 'paid' && !wd.notReceived && (
        <button onClick={() => flag(wd.id)} className="mt-3 text-xs font-bold text-white/60 underline underline-offset-4">I didn’t receive this</button>
      )}
      {wd.notReceived && <div className="mt-2 text-xs text-amber-300">You reported this as not received. We’ll look into it.</div>}
    </div>
  );

  if (!state.open) {
    return (
      <div className="space-y-4">
        <div className="flex gap-3 rounded-3xl border border-white/15 bg-white/[0.04] p-5">
          <Lock size={22} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-extrabold">Withdrawals are not open yet</div>
            <p className="mt-1 text-sm leading-relaxed text-white/60">
              {state.opensAt ? `Withdrawals open on ${new Date(state.opensAt).toLocaleString()}.` : 'A go-live date has not been set yet.'} Payouts are sent by hand as bank transfers.
            </p>
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-6">
          <div className="text-sm font-semibold text-white/50">Minimum withdrawal</div>
          <div className="mt-1 text-2xl font-extrabold">{w.minWithdrawalTokens.toLocaleString()} tokens = ₦{w.minWithdrawalNaira.toLocaleString()}</div>
          <div className="mt-2 text-xs text-white/45">Your balance: {w.balanceTokens.toLocaleString()} tokens</div>
        </div>
        {state.withdrawals.length > 0 && <div className="space-y-3">{state.withdrawals.map(history)}</div>}
      </div>
    );
  }

  const belowMin = w.balanceTokens < w.minWithdrawalTokens;
  return (
    <div className="space-y-4">
      {state.hasOpenRequest ? (
        <div className="rounded-3xl border border-amber-400/30 bg-amber-400/10 p-5 text-sm text-amber-200">
          You have a withdrawal in progress. You can request another once it is settled.
        </div>
      ) : belowMin ? (
        <div className="rounded-3xl border border-white/15 bg-white/[0.04] p-5 text-sm text-white/60">
          You need at least {w.minWithdrawalTokens.toLocaleString()} tokens (₦{w.minWithdrawalNaira.toLocaleString()}) to withdraw. You have {w.balanceTokens.toLocaleString()}.
        </div>
      ) : (
        <div className="space-y-3 rounded-3xl border border-white/15 bg-[#0e0e0e] p-5 sm:p-6">
          <h3 className="font-extrabold">Request a withdrawal</h3>
          <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank (e.g. Opay, GTBank)" className={field} />
          <input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Account name" className={field} />
          <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} inputMode="numeric" placeholder="Account number" className={field} />
          <div>
            <label className="mb-1 block text-xs text-white/50">Amount in tokens (min {w.minWithdrawalTokens.toLocaleString()})</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min={w.minWithdrawalTokens} max={w.balanceTokens} className={field} />
            <div className="mt-1 text-xs text-white/45">You’ll receive ≈ ₦{naira(Number(amount) || 0).toLocaleString()}</div>
          </div>
          {error && <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
          <button onClick={submit} disabled={busy || !bankName || !accountName || !accountNumber} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black hover:bg-white/90 disabled:opacity-50">
            {busy ? <Loader2 size={18} className="animate-spin" /> : null} Request ₦{naira(Number(amount) || 0).toLocaleString()}
          </button>
          <p className="text-xs text-white/40">Your tokens are held while we process the transfer by hand. You’ll be marked paid once the money is sent.</p>
        </div>
      )}
      {state.withdrawals.length > 0 && <div className="space-y-3">{state.withdrawals.map(history)}</div>}
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
