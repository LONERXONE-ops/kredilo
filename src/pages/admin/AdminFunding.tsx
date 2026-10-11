import { useEffect, useState } from 'react';
import { getFunding } from '../../lib/adminData';
import type { Funding } from '../../lib/adminData';

export default function AdminFunding() {
  const [f, setF] = useState<Funding | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { getFunding().then(setF).catch((e) => setError(e instanceof Error ? e.message : 'Could not load.')); }, []);

  const cards = f ? [
    { label: 'Total funded', t: f.fundedTokens, n: f.fundedNaira, note: 'Seeded reserve + confirmed posted-task payments' },
    { label: 'Issued as rewards', t: f.issuedTokens, n: f.issuedNaira, note: 'Tokens credited to doers' },
    { label: 'Available to issue', t: f.availableTokens, n: f.availableNaira, note: 'Rewards stop when this hits zero' },
    { label: 'Held for withdrawals', t: f.heldForWithdrawalTokens, n: f.heldForWithdrawalNaira, note: 'Reserved against open payout requests' },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-extrabold">Funding &amp; reserve</h1>
        <p className="mt-1 text-white/55">Live figures from the ledger.</p>
      </div>
      {error && <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      {!f && !error && <p className="rounded-3xl border border-white/10 p-8 text-center text-sm text-white/45">Loading...</p>}
      {f && (
        <>
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
          <p className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5 text-sm text-white/60">Rate: {f.rate.tokens} tokens = ₦{f.rate.naira}.</p>
        </>
      )}
    </div>
  );
}
