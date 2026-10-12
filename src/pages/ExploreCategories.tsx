import { Link } from 'react-router-dom';
import { ArrowRight, Gamepad2 } from 'lucide-react';
import { mockTasks } from '../lib/mockData';
import type { TaskCategory } from '../lib/mockData';
import { categoryIcon } from '../components/TaskCard';

const categories: { name: TaskCategory; label: string; text: string }[] = [
  { name: 'Social Media', label: 'Social Media', text: 'Follow, like, share and engage with content on social platforms.' },
  { name: 'Surveys', label: 'Surveys', text: 'Share your opinions and help brands improve their products and services.' },
  { name: 'Apps & Sign Ups', label: 'Apps & Sign Ups', text: 'Try new apps, create accounts and complete simple actions.' },
  { name: 'Content Creation', label: 'Content Creation', text: 'Create and submit content like posts, videos or reviews.' },
  { name: 'Gaming', label: 'Gaming', text: 'Play browser games and complete challenges.' },
  { name: 'Shopping & Offers', label: 'Shopping & Offers', text: 'Explore special offers and complete eligible actions.' },
  { name: 'Research & Reviews', label: 'Research & Reviews', text: 'Read, test and share your honest feedback.' },
  { name: 'Other', label: 'Other Tasks', text: 'Unique activities and special campaigns.' },
];

export default function ExploreCategories() {
  return (
    <div className="relative overflow-hidden">
      <div className="light-beam pointer-events-none absolute inset-y-0 right-0 w-full lg:w-[60%]" />
      <div className="relative mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-bold text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Task Categories</span>
          <h1 className="mt-5 text-[2.6rem] font-extrabold leading-[1.05] sm:text-6xl">Explore Task Categories</h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-white/60">
            Choose from a variety of activities, complete the requirements, and earn kreds for approved work.
          </p>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => {
            const Icon = categoryIcon[c.name];
            const count = mockTasks.filter((t) => t.category === c.name).length;
            return (
              <Link
                key={c.name}
                to={`/tasks?category=${encodeURIComponent(c.name)}`}
                className="group flex flex-col rounded-[1.75rem] border border-white/15 bg-white/[0.02] p-5 transition hover:border-emerald-400/35 hover:bg-emerald-500/[0.04]"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 transition group-hover:bg-emerald-500/15 group-hover:text-emerald-300"><Icon size={28} strokeWidth={1.7} /></span>
                <h2 className="mt-4 text-xl font-extrabold">{c.label}</h2>
                <p className="mt-1 text-sm leading-relaxed text-white/55">{c.text}</p>
                <span className="mt-4 inline-flex items-center gap-2 self-start rounded-full bg-emerald-500/10 px-3.5 py-2 text-sm font-bold text-emerald-300">
                  {count === 0 ? 'No tasks yet' : `${count} ${count === 1 ? 'task' : 'tasks'}`} <ArrowRight size={15} />
                </span>
              </Link>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col items-start gap-4 rounded-[1.75rem] border border-white/15 bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300"><Gamepad2 size={26} /></span>
            <div>
              <div className="text-lg font-extrabold">Play Games, Earn More</div>
              <div className="text-sm text-white/55">Our built-in browser games reward approved completions.</div>
            </div>
          </div>
          <Link to="/games" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/25 px-6 text-sm font-bold hover:bg-white/5">
            Go to Games <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}
