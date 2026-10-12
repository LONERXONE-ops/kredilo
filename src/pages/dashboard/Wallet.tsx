import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clock, Info, Loader2, Lock } from 'lucide-react';
import { getWallet } from '../../lib/tasks';
import type { Wallet as WalletData } from '../../lib/tasks';
import { Tabs } from '../../components/Tabs';
import { Kred } from '../../components/Kred';
import { flagNotReceived, getWithdrawals, requestWithdrawal, wStatusLabel } from '../../lib/withdrawals';
import type { MyWithdrawal, WithdrawalState } from '../../lib/withdrawals';

type Tab = 'overview' | 'withdraw' | 'transactions';

const reasonLabel: Record<string, string> = {
  task_reward: 'Task reward',
  withdrawal_hold: 'Withdrawal requested',
  withdrawal_release: 'Withdrawal returned',
  admin_adjust: 'Adjustment',
  referral: 'Referral bonus',
  game_reward: 'Game reward',
  follow_bonus: 'Follow bonus',
};

// Live D–H–M–S countdown to a target ISO time.
function Countdown({ to }: { to: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, new Date(to).getTime() - now);
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  const cell = (val: number, label: string) => (
    <div className="flex flex-col items-center">
      <div className="min-w-[3.5rem] rounded-2xl border border-white/10 bg-white/[0.05] py-2.5 text-center text-2xl font-extrabold tabular-nums">{String(val).padStart(2, '0')}</div>
      <div className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40">{label}</div>
    </div>
  );
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {cell(d, 'Days')}
      <span className="pb-5 text-xl font-bold text-white/25">:</span>
      {cell(h, 'Hrs')}
      <span className="pb-5 text-xl font-bold text-white/25">:</span>
      {cell(m, 'Min')}
      <span className="pb-5 text-xl font-bold text-white/25">:</span>
      {cell(s, 'Sec')}
    </div>
  );
}

function Overview({ w, goto }: { w: WalletData; goto: (t: Tab) => void }) {
  const pct = Math.min(100, (w.balanceTokens / w.minWithdrawalTokens) * 100);
  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-transparent p-6">
        <div className="text-sm font-semibold text-white/50">Available Balance</div>
        <div className="mt-1 flex items-center gap-2 text-5xl font-extrabold">
          {w.balanceTokens.toLocaleString()} <Kred size={34} className="text-emerald-400" />
        </div>
        <div className="mt-1 text-sm text-white/45">≈ ₦{w.balanceNaira.toLocaleString()} · {w.rate.tokens} kreds = ₦{w.rate.naira}</div>
        <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-[width] duration-700" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 text-xs text-white/45">
          {w.balanceTokens.toLocaleString()} / {w.minWithdrawalTokens.toLocaleString()} kreds toward the minimum withdrawal
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => goto('withdraw')} className="pressable min-h-14 rounded-full border border-white/20 text-sm font-bold hover:bg-white/5">Withdraw</button>
        <button onClick={() => goto('transactions')} className="pressable min-h-14 rounded-full border border-white/20 text-sm font-bold hover:bg-white/5">View Transactions</button>
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

  const field = 'h-12 w-full rounded-2xl border border-white/15 bg-black/40 px-4 text-sm outline-none transition focus:border-white/40';
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

  if (!state) return <div className="skeleton h-40 rounded-3xl" />;

  const chip = (st: string) => st === 'paid' ? 'bg-emerald-500/15 text-emerald-400' : st === 'cancelled' ? 'bg-red-500/15 text-red-300' : 'bg-amber-400/15 text-amber-300';
  const history = (wd: MyWithdrawal) => (
    <div key={wd.id} className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 font-extrabold">{wd.amountTokens.toLocaleString()} <Kred size={14} /> → ₦{wd.amountNaira.toLocaleString()}</div>
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
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/10"><Lock size={22} /></div>
          <div className="text-lg font-extrabold">Withdrawals open in</div>
          {state.opensAt ? (
            <>
              <p className="mt-1 text-sm text-white/55">{new Date(state.opensAt).toLocaleString()}</p>
              <div className="mt-5"><Countdown to={state.opensAt} /></div>
            </>
          ) : (
            <p className="mt-2 text-sm text-white/55">A go-live date hasn’t been set yet. We’ll announce it soon.</p>
          )}
          <p className="mx-auto mt-5 max-w-sm text-xs text-white/40">Payouts are sent by hand as bank transfers once withdrawals open.</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-6">
          <div className="text-sm font-semibold text-white/50">Minimum withdrawal</div>
          <div className="mt-1 flex items-center gap-1.5 text-2xl font-extrabold">{w.minWithdrawalTokens.toLocaleString()} <Kred size={18} /> = ₦{w.minWithdrawalNaira.toLocaleString()}</div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-white/45">Your balance: {w.balanceTokens.toLocaleString()} <Kred size={11} /></div>
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
          You need at least {w.minWithdrawalTokens.toLocaleString()} kreds (₦{w.minWithdrawalNaira.toLocaleString()}) to withdraw. You have {w.balanceTokens.toLocaleString()}.
        </div>
      ) : (
        <div className="space-y-3 rounded-3xl border border-white/15 bg-[#0e0e0e] p-5 sm:p-6">
          <h3 className="font-extrabold">Request a withdrawal</h3>
          <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank (e.g. Opay, GTBank)" className={field} />
          <input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Account name" className={field} />
          <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} inputMode="numeric" placeholder="Account number" className={field} />
          <div>
            <label className="mb-1 block text-xs text-white/50">Amount in kreds (min {w.minWithdrawalTokens.toLocaleString()})</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min={w.minWithdrawalTokens} max={w.balanceTokens} className={field} />
            <div className="mt-1 text-xs text-white/45">You’ll receive ≈ ₦{naira(Number(amount) || 0).toLocaleString()}</div>
          </div>
          {error && <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
          <button onClick={submit} disabled={busy || !bankName || !accountName || !accountNumber} className="pressable flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black hover:bg-white/90 disabled:opacity-50">
            {busy ? <Loader2 size={18} className="animate-spin" /> : null} Request ₦{naira(Number(amount) || 0).toLocaleString()}
          </button>
          <p className="text-xs text-white/40">Your kreds are held while we process the transfer by hand. You’ll be marked paid once the money is sent.</p>
        </div>
      )}
      {state.withdrawals.length > 0 && <div className="space-y-3">{state.withdrawals.map(history)}</div>}
    </div>
  );
}

function Transactions({ w }: { w: WalletData }) {
  if (w.transactions.length === 0) return <p className="rounded-3xl border border-white/10 p-10 text-center text-sm text-white/45">No transactions yet. Complete a task to earn kreds.</p>;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-white/45"><Info size={14} /> Your most recent transactions.</div>
      <div className="stagger space-y-3">
        {w.transactions.map((t, i) => (
          <div key={i} className="flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-[#0e0e0e] p-4">
            <div className="min-w-0">
              <div className="truncate font-bold">{reasonLabel[t.reason] ?? t.reason}</div>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-white/45"><Clock size={11} /> {new Date(t.at).toLocaleString()}</div>
            </div>
            <div className={`flex shrink-0 items-center gap-1 font-extrabold ${t.amount > 0 ? 'text-emerald-400' : 'text-white/80'}`}>{t.amount > 0 ? '+' : ''}{t.amount} <Kred size={13} /></div>
          </div>
        ))}
      </div>
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
        <p className="mt-1 text-white/55">Your kred balance, withdrawals and transaction history.</p>
      </div>
      <Tabs
        tabs={[{ id: 'overview' as Tab, label: 'Overview' }, { id: 'withdraw' as Tab, label: 'Withdraw' }, { id: 'transactions' as Tab, label: 'Transactions' }]}
        value={tab}
        onChange={setTab}
      />
      {error && <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      {!w && !error && <div className="skeleton h-48 rounded-3xl" />}
      {w && tab === 'overview' && <Overview w={w} goto={setTab} />}
      {w && tab === 'withdraw' && <Withdraw w={w} />}
      {w && tab === 'transactions' && <Transactions w={w} />}
    </div>
  );
}
