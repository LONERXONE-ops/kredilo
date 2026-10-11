import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Coins, Plus } from 'lucide-react';
import { createTask } from '../../lib/admin';
import { listTasks } from '../../lib/tasks';
import type { Task } from '../../lib/tasks';

const CATEGORIES = ['Social Media', 'Surveys', 'Apps & Sign Ups', 'Content Creation', 'Gaming', 'Shopping & Offers', 'Research & Reviews', 'Other'];
const field = 'h-12 w-full rounded-2xl border border-white/15 bg-black/40 px-4 text-sm outline-none focus:border-white/40';

export default function AdminTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [reward, setReward] = useState('30');
  const [proofType, setProofType] = useState('screenshot');
  const [needsHandle, setNeedsHandle] = useState(false);
  const [maxCompletions, setMaxCompletions] = useState('50');

  const load = () => listTasks().then(setTasks).catch(() => setTasks([]));
  useEffect(() => { void load(); }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await createTask({ title, description, category, reward: Number(reward), proofType, needsHandle, maxCompletions: Number(maxCompletions) });
      setOpen(false);
      setTitle(''); setDescription(''); setReward('30'); setMaxCompletions('50');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the task.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl font-extrabold">Tasks</h1>
          <p className="mt-1 max-w-xl text-white/55">Create tasks and set their rewards. Rewards are funded from the reserve.</p>
        </div>
        <button onClick={() => setOpen(!open)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-black hover:bg-white/90">
          <Plus size={16} /> {open ? 'Close' : 'New task'}
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="space-y-3 rounded-3xl border border-white/15 bg-[#0e0e0e] p-5 sm:p-6">
          {error && <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" className={field} />
          <textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What should the doer do?" className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm outline-none focus:border-white/40" />
          <div className="grid grid-cols-2 gap-3">
            <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category" className={field}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={proofType} onChange={(e) => setProofType(e.target.value)} aria-label="Proof type" className={field}>
              <option value="screenshot">Screenshot proof</option>
              <option value="link">Link proof</option>
              <option value="text">Text proof</option>
              <option value="none">No proof</option>
            </select>
            <label className="flex items-center gap-2 text-sm"><span className="text-white/60">Reward (tokens)</span></label>
            <label className="flex items-center gap-2 text-sm"><span className="text-white/60">Max completions</span></label>
            <input required type="number" min="1" value={reward} onChange={(e) => setReward(e.target.value)} className={field} />
            <input required type="number" min="1" value={maxCompletions} onChange={(e) => setMaxCompletions(e.target.value)} className={field} />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={needsHandle} onChange={(e) => setNeedsHandle(e.target.checked)} className="h-4 w-4 accent-white" /> Require a social handle</label>
          <button disabled={busy} className="min-h-12 w-full rounded-full bg-white text-sm font-bold text-black hover:bg-white/90 disabled:opacity-60">{busy ? 'Creating...' : 'Create & publish task'}</button>
        </form>
      )}

      <section className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5 sm:p-6">
        <h2 className="text-xl font-extrabold">Live tasks</h2>
        <div className="mt-3 divide-y divide-white/5">
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="truncate font-bold">{t.title}</div>
                <div className="text-xs text-white/45">{t.category} · {t.approvedCount}/{t.maxCompletions} done · {t.proofType}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 text-sm font-extrabold"><Coins size={15} /> {t.reward}</div>
            </div>
          ))}
          {tasks.length === 0 && <p className="py-3 text-sm text-white/45">No live tasks yet. Create one above.</p>}
        </div>
      </section>
    </div>
  );
}
