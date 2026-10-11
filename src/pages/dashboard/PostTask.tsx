import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ImageUp, Loader2 } from 'lucide-react';
import { createPost, getPostPricing, listMyPosts, getPostDoers, postStatusLabel } from '../../lib/posts';
import type { Doer, PostedTask, PostPricing } from '../../lib/posts';
import { fileToDataUrl } from '../../lib/tasks';
import { Tabs } from '../../components/Tabs';

type Tab = 'new' | 'mine';
const field = 'h-12 w-full rounded-2xl border border-white/15 bg-black/40 px-4 text-sm outline-none focus:border-white/40';

function ImagePick({ label, value, onPick }: { label: string; value: string; onPick: (dataUrl: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState('');
  return (
    <div>
      <label className="mb-1.5 block text-sm font-bold">{label}</label>
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        try { onPick(await fileToDataUrl(f)); setErr(''); } catch { setErr('Could not read that image.'); }
      }} />
      <button type="button" onClick={() => ref.current?.click()} className="flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/25 bg-black/30 text-sm text-white/60 hover:border-white/50">
        {value ? <img src={value} alt="" className="max-h-32 rounded-xl" /> : <><ImageUp size={24} /> Tap to choose</>}
      </button>
      {err && <p className="mt-1 text-xs text-red-400">{err}</p>}
    </div>
  );
}

function NewPost({ pricing }: { pricing: PostPricing }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(pricing.categories[0]);
  const [days, setDays] = useState(pricing.options[0].days);
  const [maxCompletions, setMaxCompletions] = useState('10');
  const [needsHandle, setNeedsHandle] = useState(true);
  const [photo, setPhoto] = useState('');
  const [receipt, setReceipt] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ priceNaira: number } | null>(null);

  const plan = pricing.options.find((o) => o.days === days)!;
  const pay = pricing.payTo;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!photo) return setError('Add a photo for your task.');
    if (!receipt) return setError('Attach your payment receipt.');
    setBusy(true);
    setError('');
    try {
      const r = await createPost({ title, description, category, days, maxCompletions: Number(maxCompletions), needsHandle, photo, receipt });
      setDone({ priceNaira: r.priceNaira });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post your task.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-center">
        <h2 className="text-xl font-extrabold text-emerald-300">Task submitted</h2>
        <p className="mt-2 text-sm text-white/70">Your task is awaiting payment confirmation. Once we confirm your ₦{done.priceNaira.toLocaleString()} transfer, it goes live for doers.</p>
        <button onClick={() => setDone(null)} className="mt-5 min-h-11 rounded-full border border-white/25 px-6 text-sm font-bold">Post another</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-3xl border border-white/15 bg-[#0e0e0e] p-5 sm:p-6 space-y-3">
        <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title (e.g. Follow my TikTok)" className={field} />
        <textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Describe exactly what doers must do" className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm outline-none focus:border-white/40" />
        <div className="grid grid-cols-2 gap-3">
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category" className={field}>
            {pricing.categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Duration" className={field}>
            {pricing.options.map((o) => <option key={o.days} value={o.days}>{o.days} {o.days === 1 ? 'day' : 'days'} — ₦{o.price_naira.toLocaleString()}</option>)}
          </select>
          <div>
            <label className="mb-1 block text-xs text-white/50">How many people</label>
            <input required type="number" min="1" value={maxCompletions} onChange={(e) => setMaxCompletions(e.target.value)} className={field} />
          </div>
          <label className="flex items-end gap-2 pb-3 text-sm"><input type="checkbox" checked={needsHandle} onChange={(e) => setNeedsHandle(e.target.checked)} className="h-4 w-4 accent-white" /> Ask for their handle</label>
        </div>
        <ImagePick label="Task photo" value={photo} onPick={setPhoto} />
      </div>

      <div className="rounded-3xl border border-white/15 bg-white/[0.03] p-5 sm:p-6">
        <h3 className="font-extrabold">Payment</h3>
        <p className="mt-1 text-sm text-white/60">Each doer earns {plan.reward_tokens} tokens. Transfer <span className="font-bold text-white">₦{plan.price_naira.toLocaleString()}</span> to:</p>
        <div className="mt-3 rounded-2xl bg-black/40 p-4 text-sm">
          {pay.bankName || pay.accountNumber ? (
            <>
              <div className="font-bold">{pay.accountName}</div>
              <div className="text-white/70">{pay.bankName} · {pay.accountNumber}</div>
            </>
          ) : (
            <div className="text-white/50">Payment details will be shown here once set up by the admin.</div>
          )}
        </div>
        <div className="mt-4"><ImagePick label="Upload your payment receipt" value={receipt} onPick={setReceipt} /></div>
        <p className="mt-2 text-xs text-white/45">Your task goes live only after we confirm the money has arrived. A receipt alone isn’t payment.</p>
      </div>

      {error && <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      <button disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black hover:bg-white/90 disabled:opacity-60">
        {busy ? <Loader2 size={18} className="animate-spin" /> : null} Submit task for ₦{plan.price_naira.toLocaleString()}
      </button>
    </form>
  );
}

function DoerList({ taskId }: { taskId: string }) {
  const [data, setData] = useState<{ ongoing: Doer[]; completed: Doer[] } | null>(null);
  useEffect(() => { getPostDoers(taskId).then(setData).catch(() => setData({ ongoing: [], completed: [] })); }, [taskId]);
  if (!data) return <p className="py-2 text-sm text-white/45">Loading doers...</p>;
  const row = (d: Doer) => (
    <div key={d.id} className="flex items-center gap-3 border-t border-white/5 py-2 first:border-t-0">
      {d.proofFile ? <a href={`/api/uploads?file=${d.proofFile}`} target="_blank" rel="noreferrer"><img src={`/api/uploads?file=${d.proofFile}`} alt="proof" className="h-12 w-12 rounded-lg object-cover" /></a> : <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 text-xs text-white/40">—</div>}
      <div className="text-sm"><div className="font-semibold">{d.handle ?? 'No handle'}</div><div className="text-xs text-white/45">{d.status === 'approved' ? 'Approved' : d.status === 'pending_review' ? 'Submitted' : 'In progress'}</div></div>
    </div>
  );
  return (
    <div className="mt-3 grid gap-4 sm:grid-cols-2">
      <div><div className="mb-1 text-xs font-bold uppercase tracking-wide text-white/45">Ongoing ({data.ongoing.length})</div>{data.ongoing.length ? data.ongoing.map(row) : <p className="py-2 text-sm text-white/40">Nobody yet.</p>}</div>
      <div><div className="mb-1 text-xs font-bold uppercase tracking-wide text-white/45">Completed ({data.completed.length})</div>{data.completed.length ? data.completed.map(row) : <p className="py-2 text-sm text-white/40">None yet.</p>}</div>
    </div>
  );
}

function MyPosts() {
  const [posts, setPosts] = useState<PostedTask[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { listMyPosts().then(setPosts).catch(() => setPosts([])); }, []);
  if (!posts) return <p className="rounded-3xl border border-white/10 p-8 text-center text-sm text-white/45">Loading...</p>;
  if (posts.length === 0) return <p className="rounded-3xl border border-white/10 p-8 text-center text-sm text-white/45">You haven’t posted any tasks yet.</p>;
  return (
    <div className="space-y-3">
      {posts.map((p) => (
        <div key={p.id} className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-extrabold">{p.title}</h3>
              <div className="mt-1 text-xs text-white/45">{p.approvedCount}/{p.maxCompletions} done · {p.reward} tokens each</div>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${p.status === 'live' ? 'bg-emerald-500/15 text-emerald-400' : p.status === 'rejected' ? 'bg-red-500/15 text-red-300' : 'bg-amber-400/15 text-amber-300'}`}>{postStatusLabel[p.status] ?? p.status}</span>
          </div>
          {p.paymentNote && p.status === 'rejected' && <p className="mt-2 text-sm text-red-400">Reason: {p.paymentNote}</p>}
          {p.status === 'live' && (
            <>
              <button onClick={() => setOpen(open === p.id ? null : p.id)} className="mt-3 text-sm font-bold underline underline-offset-4">{open === p.id ? 'Hide doers' : 'View doers & proof'}</button>
              {open === p.id && <DoerList taskId={p.id} />}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export default function PostTask() {
  const [tab, setTab] = useState<Tab>('new');
  const [pricing, setPricing] = useState<PostPricing | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { getPostPricing().then(setPricing).catch((e) => setError(e instanceof Error ? e.message : 'Could not load.')); }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link to="/dashboard/profile" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"><ArrowLeft size={16} /> Back to profile</Link>
      <div>
        <h1 className="text-4xl font-extrabold">Post a Task</h1>
        <p className="mt-1 text-white/55">Pay to post a task and have Kredilo users complete it.</p>
      </div>
      <Tabs tabs={[{ id: 'new' as Tab, label: 'New Task' }, { id: 'mine' as Tab, label: 'My Posted Tasks' }]} value={tab} onChange={setTab} />
      {error && <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      {tab === 'new' ? (pricing ? <NewPost pricing={pricing} /> : !error && <p className="rounded-3xl border border-white/10 p-8 text-center text-sm text-white/45">Loading...</p>) : <MyPosts />}
    </div>
  );
}
