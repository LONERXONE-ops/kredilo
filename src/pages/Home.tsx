import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      {/* Subtle light beam on the right */}
      <div className="pointer-events-none absolute top-0 right-0 w-[50%] h-[70%] bg-gradient-to-bl from-white/[0.03] via-transparent to-transparent" />

      {/* Hero */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <h1 className="text-5xl sm:text-6xl lg:text-[4.5rem] font-extrabold tracking-tight leading-[0.95]">
              Complete Tasks.<br />Earn Rewards.
            </h1>
            <p className="mt-6 text-lg text-white/60 max-w-md leading-relaxed">
              Discover eligible activities, complete the requirements, and track your tokens in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup" className="inline-flex items-center gap-2 bg-white text-black px-6 py-3.5 rounded-full font-semibold hover:bg-white/90 transition">
                Sign Up <ArrowRight size={18} />
              </Link>
              <Link to="/tasks" className="inline-flex items-center gap-2 border border-white/20 px-6 py-3.5 rounded-full font-semibold hover:bg-white/5 transition">
                Explore Tasks <ArrowRight size={18} />
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="bg-[#111111] border border-white/[0.08] rounded-[1.75rem] p-6 shadow-2xl">
              <div className="text-xs text-white/40 mb-4">Demo balance</div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs">TK</div>
                <div className="flex-1 h-1.5 bg-white/10 rounded-full" />
                <ArrowRight size={16} className="text-white/30" />
              </div>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center p-3.5 bg-white/[0.04] rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/10 rounded-lg" />
                    <span className="text-sm">Your Tasks</span>
                  </div>
                  <span className="text-xs px-2.5 py-1 bg-white/10 rounded-full">In Progress</span>
                </div>
                <div className="flex justify-between items-center p-3.5 bg-white/[0.04] rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/10 rounded-lg" />
                    <span className="text-sm">Available</span>
                  </div>
                  <span className="text-xs px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-full">Available</span>
                </div>
                <div className="flex justify-between items-center p-3.5 bg-white/[0.04] rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/10 rounded-lg" />
                    <span className="text-sm">Completed</span>
                  </div>
                  <span className="text-xs px-2.5 py-1 bg-white/10 rounded-full">Completed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { n: '1', title: 'Choose a task' },
            { n: '2', title: 'Complete the requirements' },
            { n: '3', title: 'Earn eligible tokens' },
          ].map((s) => (
            <div key={s.n} className="flex items-center gap-4 p-5 border border-white/[0.08] rounded-2xl bg-[#111]/60">
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm">{s.n}</div>
              <span className="font-medium">{s.title}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}