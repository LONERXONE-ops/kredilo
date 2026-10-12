import { useEffect, useState } from 'react';
import { CalendarClock, Check, Loader2, Lock, Megaphone } from 'lucide-react';
import { getWithdrawalSettings, setWithdrawalOpen } from '../../lib/withdrawals';
import { getPostPricing, setPostRate } from '../../lib/posts';
import { Kred } from '../../components/Kred';

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
      <div>
        <h1 className="text-4xl font-extrabold">Settings</h1>
        <p className="mt-1 text-white/55">Platform controls.</p>
      </div>
      <div className="stagger space-y-4">
        <Withdrawals />
        <PostingRate />
      </div>
    </div>
  );
}
