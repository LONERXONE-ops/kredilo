import { Link } from 'react-router-dom';

export type Section = { h: string; p: string[] };

export function PolicyLayout({ badge, title, intro, sections, updated = 'October 2026' }: { badge: string; title: string; intro: string; sections: Section[]; updated?: string }) {
  return (
    <div className="relative overflow-hidden">
      <div className="light-beam pointer-events-none absolute inset-y-0 right-0 w-full lg:w-[60%]" />
      <div className="relative mx-auto max-w-3xl px-5 py-12 sm:px-6 lg:py-16">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-bold text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {badge}</span>
        <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] sm:text-6xl">{title}</h1>
        <p className="mt-5 text-lg leading-relaxed text-white/60">{intro}</p>
        <p className="mt-3 text-sm text-white/40">Last updated: {updated}</p>
        <div className="mt-10 space-y-4">
          {sections.map((s, i) => (
            <section key={s.h} className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
              <h2 className="text-lg font-extrabold sm:text-xl"><span className="text-emerald-400">{i + 1}.</span> {s.h}</h2>
              {s.p.map((t) => <p key={t} className="mt-2 leading-relaxed text-white/65">{t}</p>)}
            </section>
          ))}
        </div>
        <p className="mt-8 text-sm text-white/45">
          Questions? <Link to="/contact" className="font-bold text-white underline underline-offset-4">Contact us</Link> or read the <Link to="/faq" className="font-bold text-white underline underline-offset-4">FAQ</Link>.
        </p>
      </div>
    </div>
  );
}
