import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Coins, FileText } from 'lucide-react';
import { HeroMockup } from '../components/HeroMockup';

const steps = [
  { n: '1', title: 'Choose a task', icon: FileText },
  { n: '2', title: 'Complete the requirements', icon: CheckCircle2 },
  { n: '3', title: 'Earn eligible kreds', icon: Coins },
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
            <h1 className="text-[2.9rem] leading-[1.02] font-extrabold sm:text-6xl lg:text-[4.4rem] xl:text-[5rem]">
              Complete Tasks.
              <br />
              Earn Rewards.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-white/60 sm:text-xl">
              Discover eligible activities, complete the requirements, and track your kreds in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup" className="inline-flex min-h-12 items-center gap-2.5 rounded-full bg-white px-7 py-3.5 text-base font-bold text-black transition hover:bg-white/90">
                Sign Up <ArrowRight size={18} />
              </Link>
              <Link to="/tasks" className="inline-flex min-h-12 items-center gap-2.5 rounded-full border border-white/25 px-7 py-3.5 text-base font-bold text-white transition hover:bg-white/5">
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
    </div>
  );
}
