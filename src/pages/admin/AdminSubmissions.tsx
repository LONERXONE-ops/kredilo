import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { approveSubmission, listPendingSubmissions, rejectSubmission } from '../../lib/admin';
import type { PendingSubmission } from '../../lib/admin';
import { Kred } from '../../components/Kred';

export default function AdminSubmissions() {
  const [subs, setSubs] = useState<PendingSubmission[] | null>(null);
  const [error, setError] = useState('');
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState('');

  const load = () => listPendingSubmissions().then(setSubs).catch((e) => setError(e instanceof Error ? e.message : 'Could not load the queue.'));
  useEffect(() => { void load(); }, []);

  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
    setError('');
    try {
      await fn();
      setRejecting(null);
      setReason('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-extrabold">Submissions</h1>
        <p className="mt-1 text-white/55">Proof awaiting review. Approving credits the reward through the ledger.</p>
      </div>
      {error && <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      {!subs && !error && <p className="rounded-3xl border border-white/10 p-8 text-center text-sm text-white/45">Loading...</p>}
      {subs && subs.length === 0 && <p className="rounded-3xl border border-white/10 p-8 text-center text-sm text-white/45">Nothing awaiting review.</p>}

      <div className="space-y-3">
        {subs?.map((s) => (
          <div key={s.id} className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-extrabold">{s.title}</h3>
                <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-emerald-400"><Kred size={14} /> {s.reward} kreds</div>
                {s.handle && <div className="mt-1 text-sm text-white/60">Handle: <span className="font-semibold text-white">{s.handle}</span></div>}
                {s.proofText && <div className="mt-1 break-all text-sm text-white/60">Proof: {s.proofText}</div>}
                {s.submittedAt && <div className="mt-1 text-xs text-white/40">{new Date(s.submittedAt).toLocaleString()}</div>}
              </div>
            </div>
            {s.proofFile && (
              <a href={`/api/uploads?file=${s.proofFile}`} target="_blank" rel="noreferrer">
                <img src={`/api/uploads?file=${s.proofFile}`} alt="proof" className="mt-3 max-h-64 rounded-2xl border border-white/10 object-contain" />
              </a>
            )}
            {rejecting === s.id ? (
              <div className="mt-4 space-y-2">
                <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for rejection" className="h-11 w-full rounded-full border border-white/15 bg-black/40 px-4 text-sm outline-none focus:border-white/40" />
                <div className="flex gap-2">
                  <button disabled={!reason || busy === s.id} onClick={() => act(s.id, () => rejectSubmission(s.id, reason))} className="min-h-11 flex-1 rounded-full bg-red-500/20 text-sm font-bold text-red-300 disabled:opacity-50">Confirm reject</button>
                  <button onClick={() => { setRejecting(null); setReason(''); }} className="min-h-11 flex-1 rounded-full border border-white/20 text-sm font-bold">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex gap-2">
                <button disabled={busy === s.id} onClick={() => act(s.id, () => approveSubmission(s.id))} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-300 disabled:opacity-50"><Check size={16} /> Approve</button>
                <button onClick={() => setRejecting(s.id)} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-white/20 text-sm font-bold"><X size={16} /> Reject</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
