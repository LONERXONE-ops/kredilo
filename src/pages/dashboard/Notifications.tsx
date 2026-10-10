export default function Notifications() {
  const items = [
    { title: 'Your task has been approved', time: '3h ago', unread: true },
    { title: 'New daily challenge available', time: '5h ago', unread: true },
    { title: 'Platform update', time: '1d ago', unread: false },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>
      <div className="space-y-3">
        {items.map((n, i) => (
          <div key={i} className={`p-4 border border-white/10 rounded-xl bg-[#111] flex items-start gap-3 ${n.unread ? 'border-l-2 border-l-white' : ''}`}>
            <div className={`w-2 h-2 rounded-full mt-2 ${n.unread ? 'bg-white' : 'bg-white/20'}`} />
            <div>
              <div className="font-medium text-sm">{n.title}</div>
              <div className="text-xs text-white/40">{n.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
