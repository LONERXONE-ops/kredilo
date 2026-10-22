import { useEffect, useRef, useState } from 'react';
import { CalendarClock, Check, ImageUp, Loader2, Lock, Megaphone, Pencil } from 'lucide-react';
import { SectionHeader } from '../../components/SectionHeader';
import { getWithdrawalSettings, setWithdrawalOpen } from '../../lib/withdrawals';
import { getPostPricing, setPostRate } from '../../lib/posts';
import { getAnnouncements, sendAnnouncement, updateAnnouncement } from '../../lib/adminData';
import type { Announcement } from '../../lib/adminData';
import { fileToDataUrl } from '../../lib/tasks';
import { Kred } from '../../components/Kred';

// Blast a notification to every user, with an optional image, plus an editable history.
function Announce() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [image, setImage] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<Announcement[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const loadHistory = () => getAnnouncements().then(setHistory).catch(() => {});
  useEffect(() => { void loadHistory(); }, []);

  const onImage = async (f: File | undefined) => {
    if (!f) return;
    try { setImage(await fileToDataUrl(f, 1280)); } catch { setNote('Could not read that image.'); }
  };
  const send = async () => {
    setBusy(true); setNote('');
    try {
      const r = await sendAnnouncement(title.trim(), body.trim(), image || undefined);
      setTitle(''); setBody(''); setImage('');
      setNote(`Sent to ${r.sent} user${r.sent === 1 ? '' : 's'}.`);
      await loadHistory();
    } catch (e) { setNote(e instanceof Error ? e.message : 'Could not send.'); }
    finally { setBusy(false); }
  };
  const saveEdit = async (id: string) => {
    try { await updateAnnouncement(id, editTitle.trim(), editBody.trim()); setEditId(null); await loadHistory(); }
    catch (e) { setNote(e instanceof Error ? e.message : 'Could not update.'); }
  };
  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0e0e0e]">
      <div className="flex items-center gap-3 border-b border-white/[0.06] bg-white/[0.03] px-5 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300"><Megaphone size={20} /></span>
        <div>
          <h2 className="font-extrabold">Announcement</h2>
          <p className="text-xs text-white/50">Send one notification to every user at once.</p>
        </div>
      </div>
      <div className="space-y-3 p-5 sm:p-6">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (e.g. Withdrawals open Friday!)" className="h-12 w-full rounded-2xl border border-white/15 bg-black/40 px-4 text-sm outline-none transition focus:border-white/40" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Message (optional)" className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm outline-none transition focus:border-white/40" />
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onImage(e.target.files?.[0])} />
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => fileRef.current?.click()} className="pressable inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 px-4 text-sm font-bold hover:bg-white/5"><ImageUp size={16} /> {image ? 'Image added' : 'Add image (optional)'}</button>
          {image && <img src={image} alt="" className="h-11 w-11 rounded-xl object-cover" />}
          {image && <button type="button" onClick={() => setImage('')} className="text-xs font-bold text-white/50 underline">Remove</button>}
        </div>
        <button disabled={busy || !title.trim()} onClick={send} className="pressable inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-black disabled:opacity-50">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Megaphone size={16} />} Send to everyone
        </button>
        {note && <span className="ml-3 text-xs text-white/60">{note}</span>}

        {history.length > 0 && (
          <div className="mt-2 border-t border-white/[0.06] pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-white/40">Past announcements</h3>
            <div className="mt-2 space-y-2">
              {history.map((a) => (
                <div key={a.id} className="rounded-2xl border border-white/10 bg-black/30 p-3">
                  {editId === a.id ? (
                    <div className="space-y-2">
                      <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-10 w-full rounded-xl border border-white/15 bg-black/40 px-3 text-sm outline-none focus:border-white/40" />
                      <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={2} className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/40" />
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(a.id)} className="rounded-full bg-white px-4 py-1.5 text-xs font-bold text-black">Save</button>
                        <button onClick={() => setEditId(null)} className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-bold">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-bold">{a.title}</div>
                        {a.body && <div className="mt-0.5 text-xs text-white/55">{a.body}</div>}
                        <div className="mt-1 text-[11px] text-white/35">Sent to {a.sentCount} · {new Date(a.createdAt).toLocaleDateString()}{a.updatedAt ? ' · edited' : ''}</div>
                      </div>
                      <button onClick={() => { setEditId(a.id); setEditTitle(a.title); setEditBody(a.body ?? ''); }} aria-label="Edit announcement" className="pressable flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/70 hover:bg-white/10"><Pencil size={14} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function MiniCountdown({ to }: { to: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const diff = Math.max(0, new Date(to).getTime() - now);
  const d = Math.floor(diff / 86_400_000), h = Math.floor((diff % 86_400_000) / 3_600_000), m = Math.floor((diff % 3_600_000) / 60_000), s = Math.floor((diff % 60_000) / 1000);
  const parts: [number, string][] = [[d, 'd'], [h, 'h'], [m, 'm'], [s, 's']];
  return (
    <span className="tabular-nums font-extrabold">
      {parts.map(([v, l]) => `${v}${l}`).join(' ')}
    </span>
  );
}

function Withdrawals() {
  const [opensAt, setOpensAt] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => getWithdrawalSettings().then((s) => { setOpensAt(s.opensAt); setIsOpen(s.isOpen); if (s.opensAt) setValue(s.opensAt.slice(0, 16)); }).catch(() => {});
  useEffect(() => { void load(); }, []);

  const save = async (iso: string | null) => {
    setBusy(true); setNote('');
    try { await setWithdrawalOpen(iso); await load(); setNote('Saved.'); }
    catch (e) { setNote(e instanceof Error ? e.message : 'Could not save.'); }
    finally { setBusy(false); }
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0e0e0e]">
      <div className="flex items-center gap-3 border-b border-white/[0.06] bg-white/[0.03] px-5 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10"><CalendarClock size={20} /></span>
        <div>
          <h2 className="font-extrabold">Withdrawals</h2>
          <p className="text-xs text-white/50">Set when payouts open to everyone.</p>
        </div>
      </div>
      <div className="p-5 sm:p-6">
        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${isOpen ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-400/15 text-amber-300'}`}>
          {isOpen ? <><Check size={14} /> Open now</> : <><Lock size={14} /> Closed</>}
        </div>
        {!isOpen && opensAt && (
          <div className="mt-3 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm">
            <div className="text-white/50">Opens in</div>
            <div className="mt-0.5 text-lg"><MiniCountdown to={opensAt} /></div>
            <div className="mt-1 text-xs text-white/45">{new Date(opensAt).toLocaleString()}</div>
          </div>
        )}
        <label className="mt-4 block text-sm font-bold">Go-live date & time</label>
        <input type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} className="mt-1.5 h-12 w-full rounded-2xl border border-white/15 bg-black/40 px-4 text-sm outline-none transition focus:border-white/40" />
        <div className="mt-3 flex flex-wrap gap-2">
          <button disabled={busy || !value} onClick={() => save(new Date(value).toISOString())} className="pressable inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-black disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" /> : null} Set open date</button>
          <button disabled={busy} onClick={() => save(null)} className="pressable min-h-11 rounded-full border border-white/20 px-6 text-sm font-bold">Close withdrawals</button>
        </div>
        {note && <p className="mt-2 text-xs text-white/60">{note}</p>}
      </div>
    </section>
  );
}

function PostingRate() {
  const [naira, setNaira] = useState('');
  const [tokens, setTokens] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => getPostPricing().then((p) => { setNaira(String(p.perDayNaira)); setTokens(String(p.perDayTokens)); }).catch(() => {});
  useEffect(() => { void load(); }, []);

  const save = async () => {
    setBusy(true); setNote('');
    try { await setPostRate(Number(naira), Number(tokens)); setNote('Saved.'); }
    catch (e) { setNote(e instanceof Error ? e.message : 'Could not save.'); }
    finally { setBusy(false); }
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0e0e0e]">
      <div className="flex items-center gap-3 border-b border-white/[0.06] bg-white/[0.03] px-5 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10"><Megaphone size={20} /></span>
        <div>
          <h2 className="font-extrabold">Posting rate</h2>
          <p className="text-xs text-white/50">What users pay per day to post a task, and the kreds each doer earns per day.</p>
        </div>
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
        <div>
          <label className="mb-1 block text-xs text-white/50">Price per day (₦)</label>
          <input type="number" min="1" value={naira} onChange={(e) => setNaira(e.target.value)} className="h-12 w-full rounded-2xl border border-white/15 bg-black/40 px-4 text-sm outline-none transition focus:border-white/40" />
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1 text-xs text-white/50">Kreds per day <Kred size={11} /></label>
          <input type="number" min="1" value={tokens} onChange={(e) => setTokens(e.target.value)} className="h-12 w-full rounded-2xl border border-white/15 bg-black/40 px-4 text-sm outline-none transition focus:border-white/40" />
        </div>
        <div className="sm:col-span-2">
          <button disabled={busy || !naira || !tokens} onClick={save} className="pressable inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-black disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" /> : null} Save rate</button>
          {note && <span className="ml-3 text-xs text-white/60">{note}</span>}
        </div>
      </div>
    </section>
  );
}

export default function AdminSettings() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Settings" info="Platform controls." />
      <div className="stagger space-y-4">
        <Withdrawals />
        <PostingRate />
        <Announce />
      </div>
    </div>
  );
}
