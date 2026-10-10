import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Coins, Gamepad2, LayoutGrid, MessageCircle, Pencil, Search, ShoppingBag, Smartphone, ClipboardList } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Task, TaskCategory } from '../lib/mockData';

const categoryIcon: Record<TaskCategory, LucideIcon> = {
  'Social Media': MessageCircle,
  Surveys: ClipboardList,
  'Apps & Sign Ups': Smartphone,
  'Content Creation': Pencil,
  Gaming: Gamepad2,
  'Shopping & Offers': ShoppingBag,
  'Research & Reviews': Search,
  Other: LayoutGrid,
};

export function TaskCard({ task }: { task: Task }) {
  const Icon = categoryIcon[task.category];
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-[#0e0e0e] p-4 sm:p-5 md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10">
          <Icon size={26} strokeWidth={1.7} />
        </div>
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-[11px] font-semibold text-white/80">{task.category}</span>
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">Available</span>
          </div>
          <h3 className="text-lg font-extrabold leading-snug">{task.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-white/55">{task.description}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/45">
            <span className="flex items-center gap-1"><Clock size={12} /> {task.timeMinutes} mins</span>
            <span>{task.requiresProof ? 'Proof required' : 'No proof required'}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 md:w-44 md:flex-col md:items-end">
        <div className="flex items-center gap-1.5 text-base font-extrabold"><Coins size={18} /> {task.reward} tokens</div>
        <Link to={`/dashboard/tasks/${task.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-black hover:bg-white/90">
          View Task <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
