import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { confirmPost, listAdminPosts, rejectPost } from '../../lib/posts';
import type { AdminPost } from '../../lib/posts';

export default function AdminPayments() {
  const [posts, setPosts] = useState<AdminPost[] | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [acting, setActing] = useState<string | null>(null);
  const [busy, setBusy] = useState('');

  const load = () => listAdminPosts().then(setPosts).catch((e) => setError(e instanceof Error ? e.message : 'Could not load.'));
  useEffect(() => { void load(); }, []);

  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
    setError('');
    try { await fn(); setActing(null); setNote(''); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.'); }
    finally { setBusy(''); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-extrabold">Posted tasks</h1>
        <p className="mt-1 text-white/55">Confirm a payment only after the money is actually in the account. A receipt can be faked.</p>
      </div>
      {error && <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      {!posts && !error && <p className="rounded-3xl border border-white/10 p-8 text-center text-sm text-white/45">Loading...</p>}
      {posts && posts.length === 0 && <p className="rounded-3xl border border-white/10 p-8 text-center text-sm text-white/45">No posted tasks awaiting payment.</p>}

      <div className="space-y-3">
        {posts?.map((p) => (
          <div key={p.id} className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-extrabold">{p.title}</h3>
                <p className="mt-1 text-sm text-white/60">{p.description}</p>
                <div className="mt-2 text-sm">
                  <span className="font-bold">₦{(p.priceNaira ?? 0).toLocaleString()}</span> for {p.maxCompletions} people · {p.days} {p.days === 1 ? 'day' : 'days'} · {p.reward} tokens each · pool {p.pool} tokens
                </div>
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {p.photo && <div><div className="mb-1 text-xs text-white/45">Task photo</div><a href={`/api/uploads?file=${p.photo}`} target="_blank" rel="noreferrer"><img src={`/api/uploads?file=${p.photo}`} alt="task" className="max-h-48 rounded-2xl border border-white/10 object-contain" /></a></div>}
              {p.receipt && <div><div className="mb-1 text-xs text-white/45">Payment receipt</div><a href={`/api/uploads?file=${p.receipt}`} target="_blank" rel="noreferrer"><img src={`/api/uploads?file=${p.receipt}`} alt="receipt" className="max-h-48 rounded-2xl border border-white/10 object-contain" /></a></div>}
            </div>
            {acting === p.id ? (
              <div className="mt-4 space-y-2">
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for rejection" className="h-11 w-full rounded-full border border-white/15 bg-black/40 px-4 text-sm outline-none focus:border-white/40" />
                <div className="flex gap-2">
                  <button disabled={!note || busy === p.id} onClick={() => act(p.id, () => rejectPost(p.id, note))} className="min-h-11 flex-1 rounded-full bg-red-500/20 text-sm font-bold text-red-300 disabled:opacity-50">Confirm reject</button>
                  <button onClick={() => { setActing(null); setNote(''); }} className="min-h-11 flex-1 rounded-full border border-white/20 text-sm font-bold">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex gap-2">
                <button disabled={busy === p.id} onClick={() => act(p.id, () => confirmPost(p.id, 'Payment confirmed'))} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-300 disabled:opacity-50"><Check size={16} /> Confirm payment & go live</button>
                <button onClick={() => setActing(p.id)} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-white/20 text-sm font-bold"><X size={16} /> Reject</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
