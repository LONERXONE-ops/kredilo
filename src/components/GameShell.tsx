import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function GameShell({ title, goal, children }: { title: string; goal: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-md">
      <Link to="/dashboard/games" className="mb-5 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-white/60 hover:text-white">
        <ArrowLeft size={16} /> Back to Games
      </Link>
      <h1 className="text-4xl font-extrabold">{title}</h1>
      <p className="mt-1 text-white/60">{goal}</p>
      <div className="mt-6">{children}</div>
      <p className="mt-6 text-center text-xs leading-relaxed text-white/40">
        Earn kreds once a day per game. Play your best round, then claim your reward.
      </p>
    </div>
  );
}
