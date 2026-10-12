import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, CheckCircle2, Coins, Eye, FileText, Gamepad2, Gift, ListChecks, Megaphone, ShieldCheck, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { HeroMockup } from '../components/HeroMockup';

const steps = [
  { n: '1', title: 'Choose a task', icon: FileText },
  { n: '2', title: 'Complete the requirements', icon: CheckCircle2 },
  { n: '3', title: 'Earn eligible kreds', icon: Coins },
];

const earn: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: ListChecks, title: 'Complete tasks', text: 'Follow accounts, try apps, take surveys and more — with the reward shown before you start.' },
  { icon: Gamepad2, title: 'Play daily games', text: 'Snake, Trivia, Memory and Reaction. A fresh chance to earn kreds every single day.' },
  { icon: Gift, title: 'Invite friends', text: 'Share your code and earn kreds each time someone you invite completes their first task.' },
  { icon: Megaphone, title: 'Post your own task', text: 'Need something done? Pay to have the Kredilo community complete a task for you.' },
];

const trust: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Eye, title: 'Rewards shown upfront', text: 'You always see exactly what a task pays before you lift a finger. No surprises.' },
  { icon: BadgeCheck, title: 'Clear, fair rules', text: 'Straightforward verification and transparent rules for how and when you get paid.' },
  { icon: Wallet, title: 'Withdraw as Naira', text: 'Turn the kreds you earn into real Naira once your balance passes the minimum.' },
  { icon: ShieldCheck, title: 'Built for Nigeria', text: 'Made for Nigerian users from the ground up — your tasks, your rewards, your way.' },
];

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      {/* Light beam sweeping from the top-right, as in the concept art */}
      <div className="light-beam pointer-events-none absolute inset-y-0 right-0 w-full lg:w-[65%]" />

      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 pt-10 pb-14 sm:pt-14 lg:pt-20 lg:pb-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-bold text-white/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Task-to-earn, built for Nigeria
            </span>
            <h1 className="mt-5 text-[2.9rem] leading-[1.02] font-extrabold sm:text-6xl lg:text-[4.4rem] xl:text-[5rem]">
              Complete Tasks.
              <br />
              Earn Rewards.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-white/60 sm:text-xl">
              Discover eligible activities, play games, invite friends, and track your kreds — all in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup" className="pressable inline-flex min-h-12 items-center gap-2.5 rounded-full bg-white px-7 py-3.5 text-base font-bold text-black transition hover:bg-white/90">
                Get Started <ArrowRight size={18} />
              </Link>
              <Link to="/tasks" className="pressable inline-flex min-h-12 items-center gap-2.5 rounded-full border border-white/25 px-7 py-3.5 text-base font-bold text-white transition hover:bg-white/5">
                Explore Tasks <ArrowRight size={18} />
              </Link>
            </div>
            <p className="mt-5 text-xs text-white/40">Complete tasks to build your balance. Withdrawals open on a set date.</p>
          </div>

          <HeroMockup />
        </div>
      </section>

      {/* Steps */}
      <section className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 pb-16">
        <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center md:gap-0">
          {steps.map((s, i) => (
            <div key={s.n} className="contents">
              <div className="flex flex-1 items-center gap-4 rounded-3xl border border-white/15 bg-white/[0.02] p-4 sm:p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl font-extrabold sm:h-14 sm:w-14">{s.n}</div>
                <span className="flex-1 text-lg font-bold leading-tight sm:text-xl">{s.title}</span>
                <s.icon size={28} strokeWidth={1.5} className="shrink-0 text-white/70" />
              </div>
              {i < steps.length - 1 && <div className="mx-auto h-4 w-px bg-white/20 md:mx-0 md:h-px md:w-6 lg:w-9" />}
            </div>
          ))}
        </div>
      </section>

      {/* Ways to earn */}
      <section className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-extrabold sm:text-4xl">More ways to earn</h2>
          <p className="mt-3 text-white/55">Kredilo isn’t just tasks. Stack up kreds however suits you.</p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {earn.map((e) => (
            <div key={e.title} className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-6 transition hover:border-white/25">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400"><e.icon size={24} /></span>
              <h3 className="mt-4 text-lg font-extrabold">{e.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/55">{e.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why Kredilo — trust band */}
      <section className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 pb-16">
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-emerald-500/[0.10] via-white/[0.02] to-transparent p-7 sm:p-10">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-extrabold sm:text-4xl">Why people trust Kredilo</h2>
            <p className="mt-3 text-white/55">A task-to-earn platform only works if it’s fair and clear. That’s the whole point of ours.</p>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {trust.map((t) => (
              <div key={t.title} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10"><t.icon size={20} /></span>
                <div>
                  <h3 className="font-extrabold">{t.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/55">{t.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 pb-20">
        <div className="rounded-[2rem] border border-white/10 bg-[#0e0e0e] p-8 text-center sm:p-12">
          <h2 className="text-3xl font-extrabold sm:text-5xl">Start earning today</h2>
          <p className="mx-auto mt-4 max-w-md text-white/55">Create your free account in minutes and get straight to your first task.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/signup" className="pressable inline-flex min-h-12 items-center gap-2.5 rounded-full bg-white px-8 py-3.5 text-base font-bold text-black transition hover:bg-white/90">
              Create account <ArrowRight size={18} />
            </Link>
            <Link to="/how-it-works" className="pressable inline-flex min-h-12 items-center gap-2.5 rounded-full border border-white/25 px-8 py-3.5 text-base font-bold transition hover:bg-white/5">
              How it works
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
