import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Clock, Coins, Search } from 'lucide-react';
import { mockTasks } from '../lib/mockData';
import { categoryIcon } from '../components/TaskCard';

export default function FeaturedTasks() {
  const [params] = useSearchParams();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(params.get('category') ?? 'All');
  const categories = ['All', ...Array.from(new Set(mockTasks.map((t) => t.category)))];

  const list = mockTasks.filter(
    (t) => (category === 'All' || t.category === category) && t.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="relative overflow-hidden">
      <div className="light-beam pointer-events-none absolute inset-y-0 right-0 w-full lg:w-[60%]" />
      <div className="relative mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid items-end gap-6 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-bold text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Task Marketplace</span>
            <h1 className="mt-4 text-[2.6rem] font-extrabold leading-[1.05] sm:text-6xl">Featured Tasks</h1>
            <p className="mt-4 max-w-md text-lg text-white/60">
              Complete simple tasks and earn kreds.
            </p>
          </div>
          <div className="space-y-3">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/45" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks..."
                className="h-14 w-full rounded-full border border-white/20 bg-black/40 pl-12 pr-4 text-sm outline-none transition placeholder:text-white/35 focus:border-emerald-400/50"
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Category"
              className="h-11 rounded-full border border-white/20 bg-black/40 px-4 text-sm font-semibold outline-none"
            >
              {categories.map((c) => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((t) => {
            const Icon = categoryIcon[t.category];
            return (
              <div key={t.id} className="flex flex-col rounded-[1.75rem] border border-white/15 bg-white/[0.02] p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10"><Icon size={26} strokeWidth={1.7} /></span>
                  <div className="min-w-0 flex-1">
                    <span className="rounded-full border border-white/20 px-2.5 py-0.5 text-[11px] font-bold">{t.category}</span>
                    <h2 className="mt-1.5 text-lg font-extrabold leading-snug">{t.title}</h2>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-5 text-sm font-bold">
                  <span className="flex items-center gap-1.5 text-emerald-400"><Coins size={17} /> {t.reward} kreds</span>
                  <span className="flex items-center gap-1.5 text-white/70"><Clock size={16} /> {t.timeMinutes} mins</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {t.requirements.slice(0, 2).map((r) => <span key={r} className="rounded-full border border-white/15 px-3 py-1 text-xs">{r}</span>)}
                  {t.requirements.length > 2 && <span className="rounded-full border border-white/15 px-3 py-1 text-xs">+{t.requirements.length - 2} more</span>}
                </div>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-white/55">{t.description}</p>
                <Link to={`/dashboard/tasks/${t.id}`} className="mt-4 inline-flex min-h-11 items-center gap-2 self-end rounded-full border border-white/25 px-5 text-sm font-bold hover:bg-white/5">
                  View Task <ArrowRight size={16} />
                </Link>
              </div>
            );
          })}
        </div>
        {list.length === 0 && <p className="mt-8 rounded-3xl border border-white/10 p-10 text-center text-white/45">No tasks match your search.</p>}
      </div>
    </div>
  );
}
