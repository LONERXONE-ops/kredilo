import { useEffect, useState } from 'react';
import { getWithdrawalSettings, setWithdrawalOpen } from '../../lib/withdrawals';

export default function AdminSettings() {
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
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-extrabold">Settings</h1>
        <p className="mt-1 text-white/55">Platform controls.</p>
      </div>

      <section className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5 sm:p-6">
        <h2 className="text-xl font-extrabold">Withdrawals</h2>
        <div className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${isOpen ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-400/15 text-amber-300'}`}>
          {isOpen ? 'Open now' : opensAt ? `Opens ${new Date(opensAt).toLocaleString()}` : 'Closed (no date set)'}
        </div>
        <p className="mt-3 text-sm text-white/60">Pick the date and time withdrawals open. Until then, users can’t request a payout.</p>
        <input type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} className="mt-3 h-12 w-full rounded-2xl border border-white/15 bg-black/40 px-4 text-sm outline-none focus:border-white/40" />
        <div className="mt-3 flex flex-wrap gap-2">
          <button disabled={busy || !value} onClick={() => save(new Date(value).toISOString())} className="min-h-11 rounded-full bg-white px-6 text-sm font-bold text-black disabled:opacity-50">Set open date</button>
          <button disabled={busy} onClick={() => save(null)} className="min-h-11 rounded-full border border-white/20 px-6 text-sm font-bold">Close withdrawals</button>
        </div>
        {note && <p className="mt-2 text-xs text-white/60">{note}</p>}
      </section>
    </div>
  );
}
