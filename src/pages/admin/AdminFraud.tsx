import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { getFraud } from '../../lib/adminData';
import type { Fraud } from '../../lib/adminData';

export default function AdminFraud() {
  const [f, setF] = useState<Fraud | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { getFraud().then(setF).catch((e) => setError(e instanceof Error ? e.message : 'Could not load.')); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-extrabold">Fraud signals</h1>
        <p className="mt-1 text-white/55">Patterns worth a look. These are hints, not proof.</p>
      </div>
      {error && <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      {!f && !error && <p className="rounded-3xl border border-white/10 p-8 text-center text-sm text-white/45">Loading...</p>}
      {f && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5">
              <div className="text-sm font-semibold text-white/50">Reused screenshots</div>
              <div className="mt-1 text-3xl font-extrabold">{f.reusedScreenshots}</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5">
              <div className="text-sm font-semibold text-white/50">"Not received" reports</div>
              <div className="mt-1 text-3xl font-extrabold">{f.notReceivedCount}</div>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5">
            <div className="flex items-center gap-2"><ShieldAlert size={18} /><h2 className="font-extrabold">Handles used by more than one account</h2></div>
            <div className="mt-3 divide-y divide-white/5">
              {f.reusedHandles.map((h) => (
                <div key={h.handle} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-semibold">{h.handle}</span>
                  <span className="text-white/50">{h.accounts} accounts</span>
                </div>
              ))}
              {f.reusedHandles.length === 0 && <p className="py-2 text-sm text-white/45">None found.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
