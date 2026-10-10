import { Link } from 'react-router-dom';
import { mockTasks } from '../lib/mockData';
import { Clock, Coins } from 'lucide-react';

export default function FeaturedTasks() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="inline-block px-3 py-1 rounded-full bg-white/10 text-xs mb-3">Task Marketplace</div>
          <h1 className="text-4xl font-bold">Featured Tasks</h1>
          <p className="mt-2 text-white/60 max-w-xl">Complete simple tasks, earn tokens, and move closer to your withdrawal goal.</p>
        </div>
        <div className="flex gap-2">
          <input placeholder="Search tasks..." className="bg-[#111] border border-white/10 rounded-full px-4 py-2 text-sm w-48" />
        </div>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockTasks.map((task) => (
          <div key={task.id} className="p-5 border border-white/10 rounded-2xl bg-[#111] hover:border-white/20 transition flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs px-2 py-1 rounded-full bg-white/10">{task.category}</span>
              <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">Available</span>
            </div>
            <h3 className="font-semibold mb-2">{task.title}</h3>
            <div className="flex items-center gap-4 text-sm text-white/60 mb-3">
              <span className="flex items-center gap-1"><Coins size={14} /> {task.reward} Tokens</span>
              <span className="flex items-center gap-1"><Clock size={14} /> {task.timeMinutes} mins</span>
            </div>
            <p className="text-sm text-white/50 flex-1 mb-4">{task.description}</p>
            <Link to={`/dashboard/tasks/${task.id}`} className="mt-auto text-center py-2 border border-white/20 rounded-full text-sm hover:bg-white/5">
              View Task →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
