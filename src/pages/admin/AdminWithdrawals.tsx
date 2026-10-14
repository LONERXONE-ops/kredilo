import { useEffect, useState } from 'react';
import { Ban, Check, Clock } from 'lucide-react';
import { SectionHeader } from '../../components/SectionHeader';
import { cancelWithdrawal, listAdminWithdrawals, markPaid, setProcessing, wStatusLabel } from '../../lib/withdrawals';
import type { AdminWithdrawal } from '../../lib/withdrawals';

const filters = [['', 'Open'], ['paid', 'Paid'], ['cancelled', 'Cancelled']] as const;

export default function AdminWithdrawals() {
  const [filter, setFilter] = useState<string>('');
  const [rows, setRows] = useState<AdminWithdrawal[] | null>(null);
  const [error, setError] = useState('');
  const [ref, setRef] = useState<Record<string, string>>({});
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [ret, setRet] = useState(false);
  const [busy, setBusy] = useState('');

  const load = () => listAdminWithdrawals(filter || undefined).then(setRows).catch((e) => setError(e instanceof Error ? e.message : 'Could not load.'));
  useEffect(() => { void load(); }, [filter]);

  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id); setError('');
    try { await fn(); setCancelId(null); setReason(''); setRet(false); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.'); }
    finally { setBusy(''); }
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Withdrawals" info="Send the transfer by hand, then mark it paid with the reference. Confirm bank details before sending." />
      <div className="flex gap-2">
        {filters.map(([v, label]) => (
          <button key={v} onClick={() => setFilter(v)} className={`min-h-10 rounded-full border px-4 text-sm font-bold ${filter === v ? 'border-white bg-white text-black' : 'border-white/15 text-white/70'}`}>{label}</button>
        ))}
      </div>
      {error && <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      {!rows && !error && <p className="rounded-3xl border border-white/10 p-8 text-center text-sm text-white/45">Loading...</p>}
      {rows && rows.length === 0 && <p className="rounded-3xl border border-white/10 p-8 text-center text-sm text-white/45">Nothing here.</p>}

      <div className="space-y-3">
        {rows?.map((w) => (
          <div key={w.id} className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-2xl font-extrabold">₦{w.amountNaira.toLocaleString()}</div>
                <div className="text-xs text-white/45">{w.amountTokens.toLocaleString()} kreds · {w.email}</div>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${w.status === 'paid' ? 'bg-emerald-500/15 text-emerald-400' : w.status === 'cancelled' ? 'bg-red-500/15 text-red-300' : 'bg-amber-400/15 text-amber-300'}`}>{wStatusLabel[w.status]}</span>
            </div>
            <div className="mt-3 rounded-2xl bg-black/40 p-4 text-sm">
              <div className="font-bold">{w.accountName}</div>
              <div className="text-white/70">{w.bankName} · {w.accountNumber}</div>
            </div>
            {w.notReceived && <div className="mt-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-300">User reported this as not received.</div>}
            {w.transferRef && <div className="mt-2 text-xs text-white/55">Transfer ref: {w.transferRef}</div>}
            {w.adminNote && w.status === 'cancelled' && <div className="mt-2 text-sm text-red-400">Reason: {w.adminNote}</div>}

            {(w.status === 'requested' || w.status === 'processing') && (
              cancelId === w.id ? (
                <div className="mt-4 space-y-2">
                  <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for cancelling" className="h-11 w-full rounded-full border border-white/15 bg-black/40 px-4 text-sm outline-none focus:border-white/40" />
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ret} onChange={(e) => setRet(e.target.checked)} className="h-4 w-4 accent-white" /> Return the kreds to the user (leave off to void them)</label>
                  <div className="flex gap-2">
                    <button disabled={!reason || busy === w.id} onClick={() => act(w.id, () => cancelWithdrawal(w.id, reason, ret))} className="min-h-11 flex-1 rounded-full bg-red-500/20 text-sm font-bold text-red-300 disabled:opacity-50">Confirm cancel</button>
                    <button onClick={() => { setCancelId(null); setReason(''); setRet(false); }} className="min-h-11 flex-1 rounded-full border border-white/20 text-sm font-bold">Back</button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  <input value={ref[w.id] ?? ''} onChange={(e) => setRef({ ...ref, [w.id]: e.target.value })} placeholder="Bank transfer reference" className="h-11 w-full rounded-full border border-white/15 bg-black/40 px-4 text-sm outline-none focus:border-white/40" />
                  <div className="flex flex-wrap gap-2">
                    {w.status === 'requested' && <button disabled={busy === w.id} onClick={() => act(w.id, () => setProcessing(w.id))} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 px-4 text-sm font-bold"><Clock size={15} /> Mark processing</button>}
                    <button disabled={!(ref[w.id] ?? '').trim() || busy === w.id} onClick={() => act(w.id, () => markPaid(w.id, ref[w.id]))} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-300 disabled:opacity-50"><Check size={16} /> Mark paid</button>
                    <button onClick={() => setCancelId(w.id)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 px-4 text-sm font-bold"><Ban size={15} /> Cancel</button>
                  </div>
                </div>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
