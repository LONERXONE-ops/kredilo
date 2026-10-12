import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Gamepad2, LayoutGrid, ListChecks, MousePointerClick } from 'lucide-react';
import { getGamesStatus } from '../../lib/games';
import { Kred } from '../../components/Kred';

const games = [
  { key: 'snake', icon: Gamepad2, name: 'Snake', path: '/games/snake', max: 50, desc: 'Guide the snake, eat food and grow your score.' },
  { key: 'memory', icon: LayoutGrid, name: 'Memory Match', path: '/games/memory', max: 50, desc: 'Find matching pairs and complete the grid.' },
  { key: 'reaction', icon: MousePointerClick, name: 'Reaction Test', path: '/games/reaction', max: 30, desc: 'Tap as fast as you can when the signal appears.' },
  { key: 'trivia', icon: ListChecks, name: 'Trivia Quiz', path: '/games/trivia', max: 40, desc: 'Answer questions and test your knowledge.' },
];

export default function GamesHub() {
  const [claimed, setClaimed] = useState<Record<string, number>>({});
  useEffect(() => { getGamesStatus().then((s) => setClaimed(s.claimed)).catch(() => {}); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-extrabold">Games</h1>
        <p className="mt-1 max-w-xl text-white/55">Play built-in games and earn kreds — once a day per game. Play your best round, then claim your reward.</p>
      </div>
      <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {games.map((g) => {
          const done = g.key in claimed;
          return (
            <Link key={g.key} to={g.path} className="pressable flex flex-col rounded-[1.75rem] border border-white/15 bg-white/[0.02] p-4 transition hover:border-white/35">
              <span className="relative flex h-28 items-center justify-center rounded-2xl bg-white/[0.06]">
                <g.icon size={44} strokeWidth={1.5} />
                {done && <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold text-black"><Check size={11} /> Done today</span>}
              </span>
              <h2 className="mt-3 text-xl font-extrabold">{g.name}</h2>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-white/55">{g.desc}</p>
              <span className="mt-3 flex min-h-11 items-center justify-between rounded-full border border-white/20 px-4 text-xs font-bold">
                <span className="flex items-center gap-1">{done ? `Earned ${claimed[g.key]}` : `Up to ${g.max}`} <Kred size={12} /></span>
                <ArrowRight size={15} />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
