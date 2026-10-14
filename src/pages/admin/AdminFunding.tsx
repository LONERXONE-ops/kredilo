import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, Loader2, Plus, Scale } from 'lucide-react';
import { SectionHeader } from '../../components/SectionHeader';
import { addFunding, getFunding, setExchangeRate } from '../../lib/adminData';
import type { Funding } from '../../lib/adminData';
import { Kred } from '../../components/Kred';

const inputCls = 'h-12 w-full rounded-2xl border border-white/15 bg-black/40 px-4 text-sm outline-none transition focus:border-white/40';

// A card whose body is hidden until the header is tapped. Collapsed by default.
function Reveal({ icon, title, subtitle, children }: { icon: ReactNode; title: string; subtitle: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0e0e0e]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-white/[0.04] ${open ? 'border-b border-white/[0.06] bg-white/[0.03]' : ''}`}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10">{icon}</span>
        <div className="min-w-0 flex-1">
          <h2 className="font-extrabold">{title}</h2>
          <p className="truncate text-xs text-white/50">{subtitle}</p>
        </div>
        <ChevronDown size={18} className={`shrink-0 text-white/40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="animate-[fadeup_220ms_ease-out] p-5 sm:p-6">{children}</div>}
    </section>
  );
}

// Top up the reward reserve.
function AddFunding({ rate, onDone }: { rate: { tokens: number; naira: number }; onDone: () => void }) {
  const [tokens, setTokens] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const n = Number(tokens);
  const valid = Number.isFinite(n) && n > 0;
  const naira = valid && rate.tokens > 0 ? Math.floor((Math.floor(n) * rate.naira) / rate.tokens) : 0;

  const save = async () => {
    setBusy(true); setNote('');
    try { await addFunding(Math.floor(n)); setTokens(''); setNote('Funding added.'); onDone(); }
    catch (e) { setNote(e instanceof Error ? e.message : 'Could not add funding.'); }
    finally { setBusy(false); }
  };

  return (
    <Reveal icon={<Plus size={20} className="text-emerald-400" />} title="Add funding" subtitle="Top up the reserve so rewards can keep paying out.">
      <label className="mb-1 flex items-center gap-1 text-xs text-white/50">Amount to add <Kred size={11} /></label>
      <input type="number" min="1" inputMode="numeric" value={tokens} onChange={(e) => setTokens(e.target.value)} placeholder="e.g. 10000" className={inputCls} />
      <p className="mt-2 text-sm text-white/55">
        Adds <span className="font-bold text-white">{(valid ? Math.floor(n) : 0).toLocaleString()}</span> kreds ≈ <span className="font-bold text-white">₦{naira.toLocaleString()}</span> of payout capacity.
      </p>
      <button disabled={busy || !valid} onClick={save} className="pressable mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-black disabled:opacity-50">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Add to reserve
      </button>
      {note && <span className="ml-3 text-xs text-white/60">{note}</span>}
    </Reveal>
  );
}

// Change the kred <-> naira exchange rate.
function ExchangeRate({ rate, onDone }: { rate: { tokens: number; naira: number }; onDone: () => void }) {
  const [kreds, setKreds] = useState(String(rate.tokens));
  const [naira, setNaira] = useState(String(rate.naira));
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => { setKreds(String(rate.tokens)); setNaira(String(rate.naira)); }, [rate.tokens, rate.naira]);

  const k = Number(kreds), nn = Number(naira);
  const valid = Number.isFinite(k) && k > 0 && Number.isFinite(nn) && nn > 0;
  const perKred = valid ? nn / k : 0;

  const save = async () => {
    setBusy(true); setNote('');
    try { await setExchangeRate(Math.floor(k), Math.floor(nn)); setNote('Rate updated.'); onDone(); }
    catch (e) { setNote(e instanceof Error ? e.message : 'Could not update rate.'); }
    finally { setBusy(false); }
  };

  return (
    <Reveal icon={<Scale size={20} />} title="Exchange rate" subtitle="Set how many kreds equal how many Naira.">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 flex items-center gap-1 text-xs text-white/50">Kreds <Kred size={11} /></label>
          <input type="number" min="1" value={kreds} onChange={(e) => setKreds(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/50">equal this many Naira (₦)</label>
          <input type="number" min="1" value={naira} onChange={(e) => setNaira(e.target.value)} className={inputCls} />
        </div>
      </div>
      <p className="mt-3 text-sm text-white/55">
        {valid ? <>So <span className="font-bold text-white">{k.toLocaleString()}</span> kreds = <span className="font-bold text-white">₦{nn.toLocaleString()}</span> (1 kred ≈ ₦{perKred.toFixed(2)}).</> : 'Enter both values.'}
      </p>
      <div className="mt-2 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-xs text-amber-200">
        Heads up: changing this re-prices <b>every</b> existing kred balance in Naira — not just new rewards.
      </div>
      <button disabled={busy || !valid} onClick={save} className="pressable mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-black disabled:opacity-50">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Scale size={16} />} Save rate
      </button>
      {note && <span className="ml-3 text-xs text-white/60">{note}</span>}
    </Reveal>
  );
}

export default function AdminFunding() {
  const [f, setF] = useState<Funding | null>(null);
  const [error, setError] = useState('');

  const load = () => getFunding().then(setF).catch((e) => setError(e instanceof Error ? e.message : 'Could not load.'));
  useEffect(() => { void load(); }, []);

  const cards = f ? [
    { label: 'Total funded', t: f.fundedTokens, n: f.fundedNaira, note: 'Seeded reserve + confirmed posted-task payments + top-ups' },
    { label: 'Issued as rewards', t: f.issuedTokens, n: f.issuedNaira, note: 'Kreds credited to doers' },
    { label: 'Available to issue', t: f.availableTokens, n: f.availableNaira, note: 'Rewards stop when this hits zero' },
    { label: 'Held for withdrawals', t: f.heldForWithdrawalTokens, n: f.heldForWithdrawalNaira, note: 'Reserved against open payout requests' },
  ] : [];

  return (
    <div className="space-y-6">
      <SectionHeader title="Funding &amp; reserve" info="Live figures from the ledger." />
      {error && <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      {!f && !error && <p className="rounded-3xl border border-white/10 p-8 text-center text-sm text-white/45">Loading...</p>}
      {f && (
        <div className="stagger space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {cards.map((c) => (
              <div key={c.label} className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5">
                <div className="text-sm font-semibold text-white/50">{c.label}</div>
                <div className="mt-1 text-3xl font-extrabold">{c.t.toLocaleString()}</div>
                <div className="text-sm text-white/45">≈ ₦{c.n.toLocaleString()}</div>
                <div className="mt-1 text-xs text-white/40">{c.note}</div>
              </div>
            ))}
          </div>
          <AddFunding rate={f.rate} onDone={load} />
          <ExchangeRate rate={f.rate} onDone={load} />
          <p className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5 text-sm text-white/60">Current rate: {f.rate.tokens} kreds = ₦{f.rate.naira}.</p>
        </div>
      )}
    </div>
  );
}
