import { useParams, Link } from 'react-router-dom';
import { mockTasks } from '../../lib/mockData';
import { Clock, Coins, ArrowLeft } from 'lucide-react';
import { useState } from 'react';

export default function TaskDetails() {
  const { id } = useParams();
  const task = mockTasks.find(t => t.id === id) || mockTasks[0];
  const [submitted, setSubmitted] = useState(false);

  if (!task) return <div>Task not found</div>;

  return (
    <div className="max-w-3xl">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-white/60 mb-6 hover:text-white">
        <ArrowLeft size={16} /> Back to tasks
      </Link>
      <div className="border border-white/10 rounded-3xl p-8 bg-[#111]">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs px-2 py-1 rounded-full bg-white/10">{task.category}</span>
          <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">Available</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">{task.title}</h1>
        <div className="flex items-center gap-6 text-sm text-white/60 mb-6">
          <span className="flex items-center gap-1"><Coins size={16} /> {task.reward} Tokens</span>
          <span className="flex items-center gap-1"><Clock size={16} /> {task.timeMinutes} minutes</span>
        </div>
        <p className="text-white/70 mb-6">{task.description}</p>
        <h3 className="font-semibold mb-3">Requirements</h3>
        <ul className="space-y-2 mb-8">
          {task.requirements.map((r, i) => (
            <li key={i} className="flex items-center gap-2 text-sm"><span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs">✓</span> {r}</li>
          ))}
        </ul>
        {task.requiresProof && (
          <div className="mb-6 p-4 border border-white/10 rounded-xl bg-black/30">
            <label className="text-sm font-medium block mb-2">Submit Proof (screenshot or link)</label>
            <input type="text" placeholder="Paste proof URL or description" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm" />
          </div>
        )}
        {!submitted ? (
          <button onClick={() => setSubmitted(true)} className="w-full sm:w-auto bg-white text-black px-8 py-3 rounded-full font-semibold">
            Start Task / Submit
          </button>
        ) : (
          <div className="p-4 border border-emerald-500/30 bg-emerald-500/10 rounded-xl text-emerald-400 text-sm">
            Submission received. Awaiting verification. (Demo — no real reward credited)
          </div>
        )}
      </div>
    </div>
  );
}
