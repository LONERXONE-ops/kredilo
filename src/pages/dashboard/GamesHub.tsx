import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Flame, Gamepad2, LayoutGrid, ListChecks, Loader2, MousePointerClick } from 'lucide-react';
import { getGamesStatus } from '../../lib/games';
import { claimStreak, getStreak } from '../../lib/streak';
import type { StreakStatus } from '../../lib/streak';
import { Kred } from '../../components/Kred';

// Daily check-in streak — claim once a day for a growing reward.
function StreakCard() {
  const [s, setS] = useState<StreakStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const load = () => getStreak().then(setS).catch(() => {});
  useEffect(() => { void load(); }, []);

  const claim = async () => {
    setBusy(true); setMsg('');
    try {
      const r = await claimStreak();
      if (!r.already && r.kreds) setMsg(`+${r.kreds} kreds — see you tomorrow! 🔥`);
      await load();
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not claim.'); }
    finally { setBusy(false); }
  };

  if (!s) return <div className="skeleton h-28 rounded-[1.75rem]" />;
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-emerald-400/20 bg-gradient-to-br from-emerald-500/[0.12] to-transparent p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300"><Flame size={26} /></span>
          <div>
            <div className="text-lg font-extrabold">{s.streak}-day streak</div>
            <div className="text-sm text-white/55">{s.claimedToday ? 'Claimed today — come back tomorrow!' : `Claim today for +${s.todayReward} kreds`}</div>
          </div>
        </div>
        <button onClick={claim} disabled={busy || s.claimedToday} className="pressable shrink-0 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black disabled:opacity-50">
          {s.claimedToday ? 'Done' : busy ? <Loader2 size={16} className="animate-spin" /> : 'Claim'}
        </button>
      </div>
      {msg && <p className="mt-2 text-xs font-bold text-emerald-300">{msg}</p>}
    </div>
  );
}

// Each game gets its own tint so the hub reads as a colourful shelf, not four grey tiles.
const games = [
  { key: 'snake', icon: Gamepad2, name: 'Snake', path: '/games/snake', max: 50, desc: 'Guide the snake, eat food and grow your score.', tile: 'from-emerald-500/25 to-emerald-500/[0.04]', fg: 'text-emerald-300' },
  { key: 'memory', icon: LayoutGrid, name: 'Memory Match', path: '/games/memory', max: 50, desc: 'Find matching pairs and complete the grid.', tile: 'from-violet-500/25 to-violet-500/[0.04]', fg: 'text-violet-300' },
  { key: 'reaction', icon: MousePointerClick, name: 'Reaction Test', path: '/games/reaction', max: 30, desc: 'Tap as fast as you can when the signal appears.', tile: 'from-amber-500/25 to-amber-500/[0.04]', fg: 'text-amber-300' },
  { key: 'trivia', icon: ListChecks, name: 'Trivia Quiz', path: '/games/trivia', max: 40, desc: 'Answer questions and test your knowledge.', tile: 'from-sky-500/25 to-sky-500/[0.04]', fg: 'text-sky-300' },
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
      <StreakCard />
      <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {games.map((g) => {
          const done = g.key in claimed;
          return (
            <Link key={g.key} to={g.path} className="pressable flex flex-col rounded-[1.75rem] border border-white/15 bg-white/[0.02] p-4 transition hover:border-white/35">
              <span className={`relative flex h-28 items-center justify-center rounded-2xl bg-gradient-to-br ${g.tile}`}>
                <g.icon size={44} strokeWidth={1.5} className={g.fg} />
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
