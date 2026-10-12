import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function About() {
  return (
    <div className="relative overflow-hidden">
      <div className="light-beam pointer-events-none absolute inset-y-0 right-0 w-full lg:w-[60%]" />
      <div className="relative mx-auto max-w-3xl px-5 py-12 sm:px-6 lg:py-16">
        <span className="inline-block rounded-full border border-white/25 px-4 py-1.5 text-sm font-bold">About</span>
        <h1 className="mt-5 text-[2.6rem] font-extrabold leading-[1.05] sm:text-6xl">About Kredilo</h1>
        <p className="mt-5 text-lg leading-relaxed text-white/65">
          Kredilo is a task-to-earn platform built for users in Nigeria. You complete simple activities such as surveys, social tasks, content tasks and browser games, and earn kreds when your completion is verified.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-white/65">
          We want it to be honest: clear instructions, rewards shown before you start, visible progress, and plain rules about verification and withdrawals.
        </p>
        <div className="mt-8 rounded-3xl border border-white/15 bg-white/[0.04] p-5 sm:p-6">
          <h2 className="text-xl font-extrabold">Where we are today</h2>
          <p className="mt-2 leading-relaxed text-white/65">
            Kredilo is a task-to-earn platform built for Nigeria. Complete tasks and games to earn kreds, and withdraw as Naira once withdrawals open on a set date.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/how-it-works" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-7 text-sm font-bold text-black hover:bg-white/90">How It Works <ArrowRight size={18} /></Link>
          <Link to="/rewards-policy" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/25 px-7 text-sm font-bold hover:bg-white/5">Rewards & Withdrawals</Link>
        </div>
      </div>
    </div>
  );
}
