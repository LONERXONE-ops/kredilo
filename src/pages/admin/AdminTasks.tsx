import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ClipboardList, ImageUp, Link2, Plus, Settings2, Trash2 } from 'lucide-react';
import { SectionHeader } from '../../components/SectionHeader';
import { createTask, deleteTask } from '../../lib/admin';
import { fileToDataUrl, listTasks } from '../../lib/tasks';
import type { Task } from '../../lib/tasks';
import { Kred } from '../../components/Kred';
import { Field, FormSection, SelectInput, Toggle, inputCls } from '../../components/Field';

const CATEGORIES = ['Social Media', 'Surveys', 'Apps & Sign Ups', 'Content Creation', 'Gaming', 'Shopping & Offers', 'Research & Reviews', 'Other'];

export default function AdminTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [reward, setReward] = useState('30');
  const [proofType, setProofType] = useState('screenshot');
  const [needsHandle, setNeedsHandle] = useState(false);
  const [maxCompletions, setMaxCompletions] = useState('50');
  const [link, setLink] = useState('');
  const [photo, setPhoto] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => listTasks().then(setTasks).catch(() => setTasks([]));
  useEffect(() => { void load(); }, []);

  const onPhoto = async (f: File | undefined) => {
    if (!f) return;
    try { setPhoto(await fileToDataUrl(f)); setError(''); } catch { setError('Could not read that image.'); }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await createTask({ title, description, category, reward: Number(reward), proofType, needsHandle, maxCompletions: Number(maxCompletions), link: link || undefined, photo: photo || undefined });
      setOpen(false);
      setTitle(''); setDescription(''); setReward('30'); setMaxCompletions('50'); setLink(''); setPhoto('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the task.');
    } finally { setBusy(false); }
  };

  const remove = async (t: Task) => {
    if (!window.confirm(`Delete "${t.title}"? This removes the task and all its submissions. This cannot be undone.`)) return;
    setRemoving(t.id); setError('');
    try { await deleteTask(t.id); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not delete the task.'); }
    finally { setRemoving(''); }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Tasks"
        info="Create tasks and set their rewards. Rewards are funded from the reserve."
        right={
          <button onClick={() => setOpen(!open)} className="pressable inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-black hover:bg-white/90">
            <Plus size={16} /> {open ? 'Close' : 'New task'}
          </button>
        }
      />

      {open && (
        <form onSubmit={submit} className="animate-[popin_240ms_ease-out] space-y-4">
          {error && <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}

          <FormSection title="Task details" subtitle="What should the doer do?" icon={<ClipboardList size={18} />}>
            <Field label="Task title"><input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Follow our X account" className={inputCls} /></Field>
            <Field label="Description"><textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Clear step-by-step instructions" className="w-full rounded-2xl border border-white/12 bg-black/40 px-4 py-3 text-sm outline-none transition placeholder:text-white/30 focus:border-white/40 focus:bg-black/60" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category"><SelectInput value={category} onChange={setCategory} ariaLabel="Category">{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</SelectInput></Field>
              <Field label="Proof type"><SelectInput value={proofType} onChange={setProofType} ariaLabel="Proof type">
                <option value="screenshot">Screenshot proof</option>
                <option value="link">Link proof</option>
                <option value="text">Text proof</option>
                <option value="none">No proof</option>
              </SelectInput></Field>
            </div>
          </FormSection>

          <FormSection title="Reward & limits" icon={<Settings2 size={18} />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Reward (kreds)"><input required type="number" min="1" value={reward} onChange={(e) => setReward(e.target.value)} className={inputCls} /></Field>
              <Field label="Max completions"><input required type="number" min="1" value={maxCompletions} onChange={(e) => setMaxCompletions(e.target.value)} className={inputCls} /></Field>
            </div>
            <Toggle on={needsHandle} onChange={setNeedsHandle} label="Require a social handle" />
          </FormSection>

          <FormSection title="Link & image" subtitle="Optional" icon={<Link2 size={18} />}>
            <Field label="Link to complete the task" hint="For tasks done on another site."><input value={link} onChange={(e) => setLink(e.target.value)} inputMode="url" placeholder="https://..." className={inputCls} /></Field>
            <Field label="Task image">
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
              <button type="button" onClick={() => fileRef.current?.click()} className="pressable flex min-h-24 w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-white/20 bg-black/30 text-sm text-white/55 hover:border-white/45">
                {photo ? <img src={photo} alt="" className="max-h-32 rounded-xl" /> : <><ImageUp size={24} /> Tap to add an image</>}
              </button>
            </Field>
          </FormSection>

          <button disabled={busy} className="pressable min-h-14 w-full rounded-full bg-white text-sm font-bold text-black hover:bg-white/90 disabled:opacity-60">{busy ? 'Creating...' : 'Create & publish task'}</button>
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
              <div className="flex shrink-0 items-center gap-3">
                <div className="flex items-center gap-1.5 text-sm font-extrabold text-emerald-400"><Kred size={14} /> {t.reward}</div>
                <button onClick={() => remove(t)} disabled={removing === t.id} aria-label="Delete task" className="pressable flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-red-300 hover:bg-red-500/10 disabled:opacity-50">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
          {tasks.length === 0 && <p className="py-3 text-sm text-white/45">No live tasks yet. Create one above.</p>}
        </div>
      </section>
    </div>
  );
}
