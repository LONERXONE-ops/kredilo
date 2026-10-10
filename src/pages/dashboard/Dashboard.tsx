import { Link } from 'react-router-dom';
import { mockUser, mockTasks } from '../../lib/mockData';
import { formatTokens, tokensToNaira } from '../../lib/config';
import { ArrowRight, Gamepad2 } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-white/60">Good to see you again,</p>
          <h1 className="text-3xl font-bold">{mockUser.name} 👋</h1>
          <p className="text-sm text-white/50 mt-1">Complete tasks, play games, earn tokens and request withdrawals when you’re ready.</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Available Tokens', value: formatTokens(mockUser.tokens), sub: `≈ ${tokensToNaira(mockUser.tokens)}` },
          { label: 'Pending Tokens', value: formatTokens(mockUser.pending), sub: `≈ ${tokensToNaira(mockUser.pending)}` },
          { label: 'Total Earned', value: formatTokens(mockUser.totalEarned), sub: `≈ ${tokensToNaira(mockUser.totalEarned)}` },
          { label: 'Withdrawn', value: '0', sub: '≈ ₦0.00' },
        ].map((s) => (
          <div key={s.label} className="p-5 border border-white/10 rounded-2xl bg-[#111]">
            <div className="text-sm text-white/50 mb-1">{s.label}</div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-white/40 mt-1">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 border border-white/10 rounded-2xl p-5 bg-[#111]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recommended Tasks</h2>
            <Link to="/dashboard/tasks" className="text-sm text-white/60 hover:text-white">View All</Link>
          </div>
          <div className="space-y-3">
            {mockTasks.slice(0, 4).map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5">
                <div>
                  <div className="font-medium text-sm">{t.title}</div>
                  <div className="text-xs text-white/50">{t.category} · {t.timeMinutes} mins</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">+{t.reward} tokens</div>
                  <Link to={`/dashboard/tasks/${t.id}`} className="text-xs text-white/60">View Task</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="border border-white/10 rounded-2xl p-5 bg-[#111]">
            <h3 className="font-semibold mb-3">Daily Challenge</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><Gamepad2 size={20} /></div>
              <div>
                <div className="text-sm font-medium">Play 1 Game Today</div>
                <div className="text-xs text-white/50">+250 tokens</div>
              </div>
            </div>
            <Link to="/dashboard/games" className="block w-full text-center bg-white text-black py-2.5 rounded-full text-sm font-semibold">Play Now</Link>
          </div>
          <div className="border border-white/10 rounded-2xl p-5 bg-[#111]">
            <h3 className="font-semibold mb-3">Quick Access</h3>
            <div className="grid grid-cols-2 gap-2">
              <Link to="/dashboard/games" className="p-3 border border-white/10 rounded-xl text-center text-sm hover:bg-white/5">Games Hub</Link>
              <Link to="/dashboard/wallet" className="p-3 border border-white/10 rounded-xl text-center text-sm hover:bg-white/5">My Wallet</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 border border-white/10 rounded-2xl bg-[#111] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">🎮</div>
          <div>
            <div className="font-medium">Play Games, Earn Tokens</div>
            <div className="text-sm text-white/60">Enjoy fun browser games and get rewarded for your time.</div>
          </div>
        </div>
        <Link to="/dashboard/games" className="flex items-center gap-1 text-sm font-medium">Go to Games Hub <ArrowRight size={16} /></Link>
      </div>
    </div>
  );
}
