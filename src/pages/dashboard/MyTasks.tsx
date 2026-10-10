import { mockTasks } from '../../lib/mockData';
import { Link } from 'react-router-dom';

export default function MyTasks() {
  const inProgress = mockTasks.filter(t => t.status === 'in_progress');
  const completed = mockTasks.filter(t => t.status === 'completed');
  const awaiting = mockTasks.filter(t => t.status === 'awaiting_verification');

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Tasks</h1>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="border border-white/10 rounded-2xl p-5 bg-[#111]">
          <h2 className="font-semibold mb-4">In Progress ({inProgress.length})</h2>
          {inProgress.length === 0 && <p className="text-sm text-white/40">No tasks in progress.</p>}
          {inProgress.map(t => <div key={t.id} className="text-sm py-2 border-b border-white/5">{t.title}</div>)}
        </div>
        <div className="border border-white/10 rounded-2xl p-5 bg-[#111]">
          <h2 className="font-semibold mb-4">Awaiting Verification ({awaiting.length})</h2>
          {awaiting.length === 0 && <p className="text-sm text-white/40">None awaiting review.</p>}
        </div>
        <div className="border border-white/10 rounded-2xl p-5 bg-[#111]">
          <h2 className="font-semibold mb-4">Completed ({completed.length})</h2>
          {completed.length === 0 && <p className="text-sm text-white/40">No completed tasks yet.</p>}
        </div>
      </div>
      <div className="mt-8">
        <Link to="/dashboard/tasks" className="text-sm text-white/60 hover:text-white">Explore more tasks →</Link>
      </div>
    </div>
  );
}
