import { Link } from 'react-router-dom';
import { mockTasks } from '../../lib/mockData';
import { CONFIG } from '../../lib/config';
import { Clock, Coins, Filter } from 'lucide-react';
import { useState } from 'react';

export default function DashboardTasks() {
  const [search, setSearch] = useState('');

  const filtered = mockTasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Explore Tasks</h1>
          <p className="text-sm text-white/60">Find and complete eligible tasks to earn tokens. {CONFIG.TOKENS_PER_NAIRA} tokens = ₦1</p>
        </div>
        <div className="px-3 py-1 rounded-full bg-white/10 text-xs">{CONFIG.TOKENS_PER_NAIRA} tokens = ₦1</div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..." className="bg-[#111] border border-white/10 rounded-full px-4 py-2 text-sm flex-1 min-w-[200px]" />
        <select className="bg-[#111] border border-white/10 rounded-full px-4 py-2 text-sm">
          <option>All Categories</option>
          <option>Social Media</option>
          <option>Surveys</option>
          <option>Games</option>
        </select>
        <button className="flex items-center gap-2 border border-white/10 rounded-full px-4 py-2 text-sm"><Filter size={16} /> Filters</button>
      </div>

      <div className="space-y-4">
        {filtered.map(task => (
          <div key={task.id} className="p-5 border border-white/10 rounded-2xl bg-[#111] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-lg">📋</div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/10">{task.category}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">Available</span>
                </div>
                <h3 className="font-semibold">{task.title}</h3>
                <p className="text-sm text-white/50 mt-1">{task.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-white/40">
                  <span className="flex items-center gap-1"><Clock size={12} /> {task.timeMinutes} mins</span>
                  <span>Simple · Open to all</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-1 font-semibold"><Coins size={16} /> {task.reward} tokens</div>
              <Link to={`/dashboard/tasks/${task.id}`} className="px-4 py-2 bg-white text-black rounded-full text-sm font-medium">View Task →</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
