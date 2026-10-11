import { useEffect, useState } from 'react';
import { getLedger } from '../../lib/adminData';
import type { LedgerEntry } from '../../lib/adminData';

const label: Record<string, string> = {
  task_reward: 'Task reward', withdrawal_hold: 'Withdrawal held', withdrawal_release: 'Withdrawal returned', admin_adjust: 'Adjustment',
};

export default function AdminLedger() {
  const [rows, setRows] = useState<LedgerEntry[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { getLedger().then(setRows).catch((e) => setError(e instanceof Error ? e.message : 'Could not load.')); }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-4xl font-extrabold">Ledger</h1>
        <p className="mt-1 text-white/55">Every token movement, newest first. Append-only.</p>
      </div>
      {error && <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      {!rows && !error && <p className="rounded-3xl border border-white/10 p-8 text-center text-sm text-white/45">Loading...</p>}
      <div className="space-y-2">
        {rows?.map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0e0e0e] p-4">
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">{label[r.reason] ?? r.reason}</div>
              <div className="truncate text-xs text-white/45">{r.email} · {new Date(r.at).toLocaleString()}</div>
            </div>
            <div className={`shrink-0 font-extrabold ${r.amount > 0 ? 'text-emerald-400' : 'text-white/80'}`}>{r.amount > 0 ? '+' : ''}{r.amount}</div>
          </div>
        ))}
        {rows && rows.length === 0 && <p className="rounded-3xl border border-white/10 p-8 text-center text-sm text-white/45">No ledger entries yet.</p>}
      </div>
    </div>
  );
}
