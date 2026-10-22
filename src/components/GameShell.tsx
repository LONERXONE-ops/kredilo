import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// The frame every game page sits in. Keeps a game feeling like a proper little page:
// an emerald glow backdrop, the game's own icon in a chip, the title and goal, the
// game itself, then the daily-reward note. Pass `icon` to show the game's mark.
export function GameShell({
  title,
  goal,
  children,
  icon: Icon,
}: {
  title: string;
  goal: string;
  children: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="relative mx-auto max-w-md">
      {/* emerald glow behind the game, so each page flows with the brand */}
      <div aria-hidden className="pointer-events-none absolute -top-16 left-1/2 h-56 w-80 -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="relative">
        <Link to="/dashboard/games" className="mb-5 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-white/60 transition hover:text-white">
          <ArrowLeft size={16} /> Back to Games
        </Link>
        <div className="flex items-center gap-3">
          {Icon && (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25">
              <Icon size={26} strokeWidth={1.8} />
            </span>
          )}
          <h1 className="title-glow text-4xl font-extrabold leading-none">{title}</h1>
        </div>
        <p className="mt-3 text-white/60">{goal}</p>
        <div className="mt-6">{children}</div>
        <p className="mt-6 text-center text-xs leading-relaxed text-white/40">
          Earn kreds once a day per game. Play your best round, then claim your reward.
        </p>
      </div>
    </div>
  );
}
