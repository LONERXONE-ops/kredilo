import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Coins, FileText, Gamepad2, LayoutGrid, ListChecks, MousePointerClick, ShieldCheck, Wallet } from 'lucide-react';

const games = [
  { icon: Gamepad2, name: 'Snake', desc: 'Guide the snake, eat food and grow your score.', reward: 'Up to 50 tokens', to: '/games/snake' },
  { icon: LayoutGrid, name: 'Memory Match', desc: 'Find matching pairs and complete the grid.', reward: 'Up to 50 tokens', to: '/games/memory' },
  { icon: MousePointerClick, name: 'Reaction Test', desc: 'Click as fast as you can when the signal appears.', reward: 'Up to 30 tokens', to: '/games/reaction' },
  { icon: ListChecks, name: 'Trivia Quiz', desc: 'Answer questions and test your knowledge.', reward: 'Up to 40 tokens', to: '/games/trivia' },
];

const why = [
  { icon: FileText, title: 'Clear Task Instructions', text: 'Know exactly what to do before you start.' },
  { icon: ShieldCheck, title: 'Transparent Rewards', text: 'See the token amount and eligibility upfront.' },
  { icon: CheckCircle2, title: 'Visible Progress', text: 'Track each task’s status.' },
  { icon: Coins, title: 'Trackable Token History', text: 'View your earnings and transactions anytime.' },
  { icon: Wallet, title: 'Clear Withdrawal Rules', text: 'Minimum amount and conditions shown up front. Withdrawals are not open yet.' },
];

export default function Games() {
  return (
    <div className="relative overflow-hidden">
      <div className="light-beam pointer-events-none absolute inset-y-0 right-0 w-full lg:w-[60%]" />
      <div className="relative mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <span className="inline-block rounded-full border border-white/25 px-4 py-1.5 text-sm font-bold">Built-in Games</span>
            <h1 className="mt-5 text-[2.6rem] font-extrabold leading-[1.05] sm:text-6xl">Play Games, Earn Tokens.</h1>
            <p className="mt-5 max-w-md text-lg text-white/60">
              Enjoy browser games directly on Kredilo. Rewards are only given for completions that pass server checks. Game rewards are demo-only for now.
            </p>
            <Link to="/dashboard/games" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-7 text-sm font-bold text-black hover:bg-white/90">
              Explore Games Hub <ArrowRight size={18} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {games.map((g) => (
              <Link key={g.name} to={g.to} className="flex flex-col rounded-[1.75rem] border border-white/15 bg-white/[0.02] p-4 transition hover:border-white/35">
                <span className="flex h-24 items-center justify-center rounded-2xl bg-white/[0.06]"><g.icon size={40} strokeWidth={1.5} /></span>
                <h2 className="mt-3 text-lg font-extrabold">{g.name}</h2>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-white/55">{g.desc}</p>
                <span className="mt-3 inline-flex items-center justify-between rounded-full border border-white/20 px-3 py-2 text-xs font-bold">
                  {g.reward} <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-16 grid gap-8 border-t border-white/10 pt-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <span className="inline-block rounded-full border border-white/25 px-4 py-1.5 text-sm font-bold">Why Kredilo</span>
            <h2 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">More Than Just Tasks.</h2>
            <p className="mt-4 max-w-md text-white/60">Kredilo aims to be simple and transparent about how you earn tokens.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {why.map((w) => (
              <div key={w.title} className="rounded-3xl border border-white/15 bg-white/[0.02] p-5">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10"><w.icon size={22} /></span>
                <h3 className="mt-3 font-extrabold">{w.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-white/55">{w.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
