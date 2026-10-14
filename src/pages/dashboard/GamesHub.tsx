import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Flame, Gamepad2, LayoutGrid, ListChecks, Loader2, MousePointerClick } from 'lucide-react';
import { getGamesStatus } from '../../lib/games';
import { claimStreak, getStreak } from '../../lib/streak';
import type { StreakStatus } from '../../lib/streak';
import { Kred } from '../../components/Kred';
import { SectionHeader } from '../../components/SectionHeader';

const games = [
  { key: 'snake', icon: Gamepad2, name: 'Snake', path: '/games/snake', max: 50, desc: 'Guide the snake, eat food and grow your score.', tile: 'from-emerald-500/25 to-emerald-500/[0.04]', fg: 'text-emerald-300' },
  { key: 'memory', icon: LayoutGrid, name: 'Memory Match', path: '/games/memory', max: 50, desc: 'Find matching pairs and complete the grid.', tile: 'from-violet-500/25 to-violet-500/[0.04]', fg: 'text-violet-300' },
  { key: 'reaction', icon: MousePointerClick, name: 'Reaction Test', path: '/games/reaction', max: 30, desc: 'Tap as fast as you can when the signal appears.', tile: 'from-amber-500/25 to-amber-500/[0.04]', fg: 'text-amber-300' },
  { key: 'trivia', icon: ListChecks, name: 'Trivia Quiz', path: '/games/trivia', max: 40, desc: 'Answer questions and test your knowledge.', tile: 'from-sky-500/25 to-sky-500/[0.04]', fg: 'text-sky-300' },
];

// Which day of the current 7-day cycle the streak is on (0 when the streak is broken).
const dayInWeek = (streak: number) => (streak <= 0 ? 0 : ((streak - 1) % 7) + 1);

// Flame with a ring that fills across the week; tap to open the streak details.
function StreakBadge({ streak, open, onToggle }: { streak: StreakStatus; open: boolean; onToggle: () => void }) {
  const s = streak.streak;
  const diw = dayInWeek(s);
  const R = 18;
  const C = 2 * Math.PI * R;
  const weeks = Math.floor(s / 7);
  return (
    <div className="relative shrink-0">
      <button type="button" onClick={onToggle} aria-label="Your streak" aria-expanded={open} className="pressable relative flex h-12 w-12 items-center justify-center">
        <svg width="48" height="48" viewBox="0 0 48 48" className="absolute inset-0 -rotate-90">
          <circle cx="24" cy="24" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3.5" />
          <circle cx="24" cy="24" r={R} fill="none" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - diw / 7)} className="transition-[stroke-dashoffset] duration-700 ease-out" />
        </svg>
        <Flame size={20} className={s > 0 ? 'text-emerald-400' : 'text-white/35'} fill={s > 0 ? 'currentColor' : 'none'} />
      </button>

      {open && <div className="fixed inset-0 z-20" onClick={onToggle} />}
      <div className={`absolute right-0 top-14 z-30 w-64 origin-top-right rounded-2xl border border-white/10 bg-[#0e0e0e] p-4 shadow-[0_14px_44px_-14px_rgba(0,0,0,0.95)] transition-all duration-200 ${open ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'}`}>
        <div className="flex items-center gap-2 text-lg font-extrabold"><Flame size={20} className="text-emerald-400" fill="currentColor" /> {s}-day streak</div>
        <p className="mt-0.5 text-xs text-white/50">{streak.claimedToday ? 'Claimed today — nice! 🔥' : 'Claim today to keep it alive'}</p>
        <div className="mt-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-white/40">
          <span>This week</span><span>Day {diw} / 7</span>
        </div>
        <div className="mt-1.5 flex gap-1.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <span key={i} className={`h-2 flex-1 rounded-full transition-colors ${i < diw ? 'bg-emerald-400' : 'bg-white/10'}`} />
          ))}
        </div>
        {weeks >= 1 && <div className="mt-2.5 text-xs font-bold text-emerald-300">🎉 {weeks} full week{weeks === 1 ? '' : 's'} completed</div>}
        <p className="mt-2 text-[11px] leading-relaxed text-white/35">Miss a day and your streak resets to zero.</p>
      </div>
    </div>
  );
}

// Only shows when there's a reward to claim; disappears once claimed and returns tomorrow.
function ClaimCard({ streak, onClaimed }: { streak: StreakStatus; onClaimed: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const claim = async () => {
    setBusy(true); setErr('');
    try { await claimStreak(); onClaimed(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not claim.'); }
    finally { setBusy(false); }
  };
  return (
    <div className="animate-[popin_260ms_ease-out] overflow-hidden rounded-[1.75rem] border border-emerald-400/25 bg-gradient-to-br from-emerald-500/[0.14] to-transparent p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300"><Flame size={26} fill="currentColor" /></span>
          <div>
            <div className="text-lg font-extrabold">Daily reward ready</div>
            <div className="text-sm text-white/60">Claim +{streak.todayReward} kreds and grow your streak</div>
          </div>
        </div>
        <button type="button" onClick={claim} disabled={busy} className="pressable shrink-0 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black disabled:opacity-50">
          {busy ? <Loader2 size={16} className="animate-spin" /> : 'Claim'}
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
    </div>
  );
}

export default function GamesHub() {
  const [claimed, setClaimed] = useState<Record<string, number>>({});
  const [streak, setStreak] = useState<StreakStatus | null>(null);
  const [badgeOpen, setBadgeOpen] = useState(false);

  const loadStreak = () => getStreak().then(setStreak).catch(() => {});
  useEffect(() => {
    getGamesStatus().then((s) => setClaimed(s.claimed)).catch(() => {});
    loadStreak();
  }, []);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Games"
        info="Play built-in games and earn kreds — once a day per game. Play your best round, then claim your reward."
        right={streak ? <StreakBadge streak={streak} open={badgeOpen} onToggle={() => setBadgeOpen((o) => !o)} /> : undefined}
      />

      {streak && !streak.claimedToday && <ClaimCard streak={streak} onClaimed={loadStreak} />}

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
