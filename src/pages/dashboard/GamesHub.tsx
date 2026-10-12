import { Link } from 'react-router-dom';
import { ArrowRight, Gamepad2, LayoutGrid, ListChecks, MousePointerClick } from 'lucide-react';

const games = [
  { icon: Gamepad2, name: 'Snake', path: '/games/snake', reward: 'Up to 50 kreds', desc: 'Guide the snake, eat food and grow your score.' },
  { icon: LayoutGrid, name: 'Memory Match', path: '/games/memory', reward: 'Up to 50 kreds', desc: 'Find matching pairs and complete the grid.' },
  { icon: MousePointerClick, name: 'Reaction Test', path: '/games/reaction', reward: 'Up to 30 kreds', desc: 'Tap as fast as you can when the signal appears.' },
  { icon: ListChecks, name: 'Trivia Quiz', path: '/games/trivia', reward: 'Up to 40 kreds', desc: 'Answer questions and test your knowledge.' },
];

export default function GamesHub() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-extrabold">Games</h1>
        <p className="mt-1 max-w-xl text-white/55">
          Play built-in browser games. Games are just for fun right now — they don’t pay kreds yet.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {games.map((g) => (
          <Link key={g.name} to={g.path} className="flex flex-col rounded-[1.75rem] border border-white/15 bg-white/[0.02] p-4 transition hover:border-white/35">
            <span className="flex h-28 items-center justify-center rounded-2xl bg-white/[0.06]"><g.icon size={44} strokeWidth={1.5} /></span>
            <h2 className="mt-3 text-xl font-extrabold">{g.name}</h2>
            <p className="mt-1 flex-1 text-sm leading-relaxed text-white/55">{g.desc}</p>
            <span className="mt-3 flex min-h-11 items-center justify-between rounded-full border border-white/20 px-4 text-xs font-bold">
              {g.reward} <ArrowRight size={15} />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
