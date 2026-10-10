import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-[#050505] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <Link to="/" className="text-sm text-white/60">← Back to site</Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {['Users', 'Tasks', 'Pending Reviews', 'Withdrawals'].map(s => (
            <div key={s} className="p-5 border border-white/10 rounded-2xl bg-[#111]">
              <div className="text-sm text-white/50">{s}</div>
              <div className="text-2xl font-bold mt-1">—</div>
              <div className="text-xs text-white/40 mt-1">Sample data</div>
            </div>
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="border border-white/10 rounded-2xl p-5 bg-[#111]">
            <h2 className="font-semibold mb-4">Task Management</h2>
            <p className="text-sm text-white/60">Create, edit, enable/disable tasks. Configure rewards and eligibility. (Backend required)</p>
            <button className="mt-4 text-sm border border-white/20 px-4 py-2 rounded-full">View Tasks</button>
          </div>
          <div className="border border-white/10 rounded-2xl p-5 bg-[#111]">
            <h2 className="font-semibold mb-4">Submission Review</h2>
            <p className="text-sm text-white/60">Approve or reject user submissions with reasons.</p>
            <button className="mt-4 text-sm border border-white/20 px-4 py-2 rounded-full">Review Queue</button>
          </div>
          <div className="border border-white/10 rounded-2xl p-5 bg-[#111]">
            <h2 className="font-semibold mb-4">Withdrawal Management</h2>
            <p className="text-sm text-white/60">View and update withdrawal statuses. Never mark paid without verification.</p>
            <button className="mt-4 text-sm border border-white/20 px-4 py-2 rounded-full">View Requests</button>
          </div>
          <div className="border border-white/10 rounded-2xl p-5 bg-[#111]">
            <h2 className="font-semibold mb-4">Financial Reserve</h2>
            <p className="text-sm text-white/60">Approved reserve, pending liabilities, utilization. (Sample data only)</p>
            <div className="mt-3 text-xs text-white/40">Available reserve: ₦0 (demo)</div>
          </div>
        </div>
        <p className="mt-8 text-xs text-white/40">Admin routes should be protected by backend authorization. This is a frontend skeleton.</p>
      </div>
    </div>
  );
}
