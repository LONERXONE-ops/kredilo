import { Link } from 'react-router-dom';
import { ArrowRight, FileText, CheckCircle, Coins } from 'lucide-react';

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24 lg:pt-24 lg:pb-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
              Complete Tasks.<br />Earn Rewards.
            </h1>
            <p className="mt-6 text-lg text-white/70 max-w-md">
              Discover eligible activities, complete the requirements, and track your tokens in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/signup" className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-white/90 transition">
                Sign Up <ArrowRight size={18} />
              </Link>
              <Link to="/tasks" className="inline-flex items-center gap-2 border border-white/20 px-6 py-3 rounded-full font-semibold hover:bg-white/5 transition">
                Explore Tasks <ArrowRight size={18} />
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="bg-[#111] border border-white/10 rounded-3xl p-6 shadow-2xl">
              <div className="text-sm text-white/50 mb-4">Demo balance</div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm">TK</div>
                <div className="flex-1 h-2 bg-white/10 rounded" />
                <ArrowRight size={16} className="text-white/40" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-3"><div className="w-8 h-8 bg-white/10 rounded" /><span className="text-sm">Your Tasks</span></div>
                  <span className="text-xs px-2 py-1 bg-white/10 rounded-full">In Progress</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-3"><div className="w-8 h-8 bg-white/10 rounded" /><span className="text-sm">Available</span></div>
                  <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full">Available</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-3"><div className="w-8 h-8 bg-white/10 rounded" /><span className="text-sm">Completed</span></div>
                  <span className="text-xs px-2 py-1 bg-white/10 rounded-full">Completed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { n: '1', icon: FileText, title: 'Choose a task' },
            { n: '2', icon: CheckCircle, title: 'Complete the requirements' },
            { n: '3', icon: Coins, title: 'Earn eligible tokens' },
          ].map((s) => (
            <div key={s.n} className="flex items-center gap-4 p-5 border border-white/10 rounded-2xl bg-[#111]/50">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold">{s.n}</div>
              <s.icon size={20} className="text-white/60" />
              <span className="font-medium">{s.title}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
