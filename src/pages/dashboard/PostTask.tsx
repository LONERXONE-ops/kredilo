import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { CalendarClock, ClipboardList, ImageUp, Link2, Loader2, Receipt, Users } from 'lucide-react';
import { createPost, getPostPricing, listMyPosts, getPostDoers, postStatusLabel } from '../../lib/posts';
import type { Doer, PostedTask, PostPricing } from '../../lib/posts';
import { fileToDataUrl } from '../../lib/tasks';
import { Tabs } from '../../components/Tabs';
import { Kred } from '../../components/Kred';
import { Field, FormSection, SelectInput, Toggle, inputCls } from '../../components/Field';

type Tab = 'new' | 'mine';

function ImagePick({ value, onPick }: { value: string; onPick: (dataUrl: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState('');
  return (
    <div>
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        try { onPick(await fileToDataUrl(f)); setErr(''); } catch { setErr('Could not read that image.'); }
      }} />
      <button type="button" onClick={() => ref.current?.click()} className="pressable flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-black/30 text-sm text-white/55 hover:border-white/45">
        {value ? <img src={value} alt="" className="max-h-36 rounded-xl" /> : <><ImageUp size={26} /> Tap to choose an image</>}
      </button>
      {err && <p className="mt-1 text-xs text-red-400">{err}</p>}
    </div>
  );
}

function NewPost({ pricing }: { pricing: PostPricing }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(pricing.categories[0]);
  const [days, setDays] = useState(1);
  const [maxCompletions, setMaxCompletions] = useState('10');
  const [needsHandle, setNeedsHandle] = useState(true);
  const [link, setLink] = useState('');
  const [photo, setPhoto] = useState('');
  const [receipt, setReceipt] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ priceNaira: number } | null>(null);

  const people = Math.max(0, Number(maxCompletions) || 0);
  const price = days * pricing.perDayNaira;
  const rewardEach = days * pricing.perDayTokens;
  const pool = rewardEach * people;
  const pay = pricing.payTo;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!photo) return setError('Add a photo for your task.');
    if (!receipt) return setError('Attach your payment receipt.');
    setBusy(true); setError('');
    try {
      const r = await createPost({ title, description, category, days, maxCompletions: people, needsHandle, photo, receipt, link: link || undefined });
      setDone({ priceNaira: r.priceNaira });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post your task.');
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="animate-[popin_300ms_ease-out] rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-center">
        <h2 className="text-xl font-extrabold text-emerald-300">Task submitted 🎉</h2>
        <p className="mt-2 text-sm text-white/70">Your task is awaiting payment confirmation. Once we confirm your ₦{done.priceNaira.toLocaleString()} transfer, it goes live for doers.</p>
        <button onClick={() => setDone(null)} className="pressable mt-5 min-h-11 rounded-full border border-white/25 px-6 text-sm font-bold">Post another</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormSection title="Task details" subtitle="What should doers do?" icon={<ClipboardList size={18} />}>
        <Field label="Task title"><input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Follow my TikTok" className={inputCls} /></Field>
        <Field label="Description"><textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Describe exactly what doers must do" className="w-full rounded-2xl border border-white/12 bg-black/40 px-4 py-3 text-sm outline-none transition placeholder:text-white/30 focus:border-white/40 focus:bg-black/60" /></Field>
        <Field label="Category"><SelectInput value={category} onChange={setCategory} ariaLabel="Category">{pricing.categories.map((c) => <option key={c} value={c}>{c}</option>)}</SelectInput></Field>
      </FormSection>

      <FormSection title="Reach & duration" subtitle="How many people, and for how long" icon={<Users size={18} />}>
        <Field label="How many people can do it"><input required type="number" min="1" value={maxCompletions} onChange={(e) => setMaxCompletions(e.target.value)} className={inputCls} /></Field>
        <div>
          <div className="mb-2 flex items-end justify-between">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-white/75"><CalendarClock size={15} /> How long should it run?</span>
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-extrabold text-emerald-300">{days} {days === 1 ? 'day' : 'days'}</span>
          </div>
          <input type="range" min={1} max={pricing.maxDays} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full accent-emerald-400" />
          <div className="mt-1 flex justify-between text-[11px] text-white/35"><span>1 day</span><span>{pricing.maxDays} days</span></div>
        </div>
      </FormSection>

      <FormSection title="Options" icon={<Link2 size={18} />}>
        <Toggle on={needsHandle} onChange={setNeedsHandle} label="Ask doers for their social handle" />
        <Field label="Link to complete (optional)" hint="Add a link if doers must visit another site to finish."><input value={link} onChange={(e) => setLink(e.target.value)} inputMode="url" placeholder="https://..." className={inputCls} /></Field>
        <Field label="Task image"><ImagePick value={photo} onPick={setPhoto} /></Field>
      </FormSection>

      <FormSection title="Payment" subtitle="Pay, then upload your receipt" icon={<Receipt size={18} />}>
        <div className="space-y-2 rounded-2xl bg-black/30 p-4 text-sm">
          <div className="flex justify-between"><span className="text-white/60">Each doer earns</span><span className="flex items-center gap-1 font-bold text-emerald-400">{rewardEach} <Kred size={13} /></span></div>
          <div className="flex justify-between"><span className="text-white/60">{people} people × {days} {days === 1 ? 'day' : 'days'}</span><span className="flex items-center gap-1 font-bold">{pool.toLocaleString()} <Kred size={13} /> pool</span></div>
          <div className="flex justify-between border-t border-white/10 pt-2 text-base"><span className="font-bold">You pay</span><span className="font-extrabold">₦{price.toLocaleString()}</span></div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm">
          <div className="text-xs font-semibold text-white/45">Transfer ₦{price.toLocaleString()} to</div>
          {pay.bankName || pay.accountNumber ? (
            <div className="mt-1"><div className="font-bold">{pay.accountName}</div><div className="text-white/70">{pay.bankName} · {pay.accountNumber}</div></div>
          ) : (<div className="mt-1 text-white/50">Payment details will show here once set up by the admin.</div>)}
        </div>
        <Field label="Upload your payment receipt"><ImagePick value={receipt} onPick={setReceipt} /></Field>
        <p className="text-xs text-white/40">Your task goes live only after we confirm the money has arrived. A receipt alone isn’t payment.</p>
      </FormSection>

      {error && <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      <button disabled={busy} className="pressable flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black hover:bg-white/90 disabled:opacity-60">
        {busy ? <Loader2 size={18} className="animate-spin" /> : null} Submit task for ₦{price.toLocaleString()}
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
      {d.proofFile ? <a href={`/api/uploads?file=${encodeURIComponent(d.proofFile)}`} target="_blank" rel="noreferrer"><img src={`/api/uploads?file=${encodeURIComponent(d.proofFile)}`} alt="proof" className="h-12 w-12 rounded-lg object-cover" /></a> : <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 text-xs text-white/40">—</div>}
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
  if (!posts) return <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="skeleton h-24 rounded-3xl" />)}</div>;
  if (posts.length === 0) return <p className="rounded-3xl border border-white/10 p-10 text-center text-sm text-white/45">You haven’t posted any tasks yet.</p>;
  return (
    <div className="stagger space-y-3">
      {posts.map((p) => (
        <div key={p.id} className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-extrabold">{p.title}</h3>
              <div className="mt-1 flex items-center gap-1 text-xs text-white/45">{p.approvedCount}/{p.maxCompletions} done · {p.reward} <Kred size={11} /> each</div>
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
      <div>
        <h1 className="text-4xl font-extrabold">Post a Task</h1>
        <p className="mt-1 text-white/55">Pay to post a task and have Kredilo users complete it.</p>
      </div>
      <Tabs tabs={[{ id: 'new' as Tab, label: 'New Task' }, { id: 'mine' as Tab, label: 'My Posted Tasks' }]} value={tab} onChange={setTab} />
      {error && <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      {tab === 'new' ? (pricing ? <NewPost pricing={pricing} /> : !error && <div className="skeleton h-96 rounded-3xl" />) : <MyPosts />}
    </div>
  );
}
