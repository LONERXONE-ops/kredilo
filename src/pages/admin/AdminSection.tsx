import { Navigate, useParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { SectionHeader } from '../../components/SectionHeader';
import { adminPlaceholders } from '../../lib/adminSections';

export default function AdminSection() {
  const { section = '' } = useParams();
  const info = adminPlaceholders[section];
  if (!info) return <Navigate to="/admin" replace />;

  return (
    <div className="space-y-6">
      <SectionHeader title={info.title} info={info.description} />
      <section className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold">This section will include</h2>
          <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/60">Not built yet</span>
        </div>
        <ul className="mt-4 space-y-2.5 text-sm text-white/70">
          {info.items.map((i) => <li key={i} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/50" />{i}</li>)}
        </ul>
      </section>
      <section className="flex gap-3 rounded-3xl border border-white/15 bg-white/[0.04] p-5 sm:p-6">
        <Lock size={20} className="mt-0.5 shrink-0" />
        <div>
          <div className="font-extrabold">Rule</div>
          <p className="mt-1 text-sm leading-relaxed text-white/65">{info.rule}</p>
        </div>
      </section>
    </div>
  );
}
