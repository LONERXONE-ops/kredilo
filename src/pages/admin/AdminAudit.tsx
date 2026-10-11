import { useEffect, useState } from 'react';
import { getAudit } from '../../lib/adminData';
import type { AuditEntry } from '../../lib/adminData';

export default function AdminAudit() {
  const [rows, setRows] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { getAudit().then(setRows).catch((e) => setError(e instanceof Error ? e.message : 'Could not load.')); }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-4xl font-extrabold">Audit log</h1>
        <p className="mt-1 text-white/55">A permanent record of admin and financial actions.</p>
      </div>
      {error && <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      {!rows && !error && <p className="rounded-3xl border border-white/10 p-8 text-center text-sm text-white/45">Loading...</p>}
      <div className="space-y-2">
        {rows?.map((r, i) => (
          <div key={i} className="rounded-2xl border border-white/10 bg-[#0e0e0e] p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-sm font-bold">{r.action}</span>
              <span className="shrink-0 text-xs text-white/40">{new Date(r.at).toLocaleString()}</span>
            </div>
            <div className="mt-1 text-xs text-white/50">{r.actor ?? 'system'}{r.meta ? ` · ${r.meta}` : ''}</div>
          </div>
        ))}
        {rows && rows.length === 0 && <p className="rounded-3xl border border-white/10 p-8 text-center text-sm text-white/45">No entries.</p>}
      </div>
    </div>
  );
}
