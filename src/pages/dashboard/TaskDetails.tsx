import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ExternalLink, ImageUp, Loader2 } from 'lucide-react';
import { acceptTask, fileToDataUrl, listMySubmissions, listTasks, statusLabel, submitTask } from '../../lib/tasks';
import type { MySubmission, Task } from '../../lib/tasks';
import { Kred } from '../../components/Kred';

export default function TaskDetails() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [sub, setSub] = useState<MySubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [image, setImage] = useState<string>('');
  const [preview, setPreview] = useState<string>('');
  const [text, setText] = useState('');
  const [handle, setHandle] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const [tasks, subs] = await Promise.all([listTasks(), listMySubmissions()]);
      setTask(tasks.find((t) => t.id === id) ?? null);
      setSub(subs.find((s) => s.taskId === id) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the task.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [id]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    try {
      const dataUrl = await fileToDataUrl(file);
      setImage(dataUrl);
      setPreview(dataUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that image.');
    }
  };

  const accept = async () => {
    setBusy(true);
    setError('');
    try {
      await acceptTask(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the task.');
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await submitTask({
        taskId: id,
        image: task?.proofType === 'screenshot' ? image : undefined,
        text: task?.proofType === 'link' || task?.proofType === 'text' ? text : undefined,
        handle: task?.needsHandle ? handle : undefined,
      });
      navigate('/dashboard?tab=mine');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit your proof.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="px-2 py-10 text-center text-sm text-white/50">Loading...</p>;

  if (!task && sub) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-6">
          <h1 className="text-2xl font-extrabold">{sub.title}</h1>
          <p className="mt-2 text-white/60">Status: {statusLabel[sub.status]}</p>
          {sub.rejectReason && <p className="mt-2 text-sm text-red-400">Reason: {sub.rejectReason}</p>}
        </div>
      </div>
    );
  }
  if (!task) return (
    <div className="mx-auto max-w-2xl">
      <p className="rounded-3xl border border-white/10 p-8 text-center text-white/50">This task is no longer available.</p>
    </div>
  );

  const started = sub && sub.status !== 'rejected';

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-6 sm:p-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-xs font-semibold">{task.category}</span>
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">{task.remaining} left</span>
        </div>
        <h1 className="text-3xl font-extrabold">{task.title}</h1>
        <div className="mt-2 flex items-center gap-1.5 text-lg font-bold text-emerald-400"><Kred size={18} /> {task.reward} kreds</div>
        <p className="mt-4 whitespace-pre-wrap leading-relaxed text-white/70">{task.description}</p>

        {task.photo && (
          <img src={`/api/uploads?file=${encodeURIComponent(task.photo)}`} alt="" className="mt-4 max-h-64 rounded-2xl border border-white/10 object-contain" />
        )}

        {task.link && (
          <a
            href={task.link}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.04] px-5 py-2.5 text-sm font-bold hover:bg-white/10"
          >
            <ExternalLink size={16} /> Open link to complete this task
          </a>
        )}

        {error && <p role="alert" className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}

        <div className="mt-6">
          {sub?.status === 'pending_review' && (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
              Proof submitted. Pending confirmation — you’ll get your kreds once an admin approves it.
            </div>
          )}
          {sub?.status === 'approved' && (
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
              Completed. {task.reward} kreds have been added to your wallet.
            </div>
          )}

          {!started && (
            <button onClick={accept} disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black hover:bg-white/90 disabled:opacity-60 sm:w-auto sm:px-10">
              {busy ? <Loader2 size={18} className="animate-spin" /> : null} Start Task
            </button>
          )}

          {started && sub?.status === 'in_progress' && (
            <div className="space-y-4">
              {task.needsHandle && (
                <div>
                  <label className="mb-1.5 block text-sm font-bold">Your social handle</label>
                  <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="e.g. @yourname" className="h-12 w-full rounded-2xl border border-white/15 bg-black/40 px-4 text-sm outline-none focus:border-white/40" />
                </div>
              )}
              {task.proofType === 'screenshot' && (
                <div>
                  <label className="mb-1.5 block text-sm font-bold">Upload your screenshot</label>
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
                  <button onClick={() => fileRef.current?.click()} className="flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/25 bg-black/30 text-sm text-white/60 hover:border-white/50">
                    {preview ? <img src={preview} alt="preview" className="max-h-40 rounded-xl" /> : <><ImageUp size={26} /> Tap to choose a screenshot</>}
                  </button>
                </div>
              )}
              {(task.proofType === 'link' || task.proofType === 'text') && (
                <div>
                  <label className="mb-1.5 block text-sm font-bold">{task.proofType === 'link' ? 'Paste your link' : 'Enter your proof'}</label>
                  <input value={text} onChange={(e) => setText(e.target.value)} className="h-12 w-full rounded-2xl border border-white/15 bg-black/40 px-4 text-sm outline-none focus:border-white/40" />
                </div>
              )}
              <button
                onClick={submit}
                disabled={busy || (task.proofType === 'screenshot' && !image) || (task.needsHandle && !handle)}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black hover:bg-white/90 disabled:opacity-50"
              >
                {busy ? <Loader2 size={18} className="animate-spin" /> : null} Submit Proof
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
