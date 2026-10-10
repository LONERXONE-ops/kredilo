import { mockUser } from '../../lib/mockData';

export default function Profile() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Profile & Settings</h1>
      <div className="border border-white/10 rounded-2xl p-6 bg-[#111] space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-2xl">{mockUser.name[0]}</div>
          <div>
            <div className="font-semibold text-lg">{mockUser.name}</div>
            <div className="text-sm text-white/50">{mockUser.email}</div>
            <div className="text-xs text-white/40 mt-1">ID: {mockUser.id}</div>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm block mb-1">Display Name</label>
            <input defaultValue={mockUser.name} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm block mb-1">Email</label>
            <input defaultValue={mockUser.email} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm" />
          </div>
          <button className="bg-white text-black px-6 py-2 rounded-full text-sm font-semibold">Save Changes</button>
        </div>
        <div className="pt-6 border-t border-white/10">
          <h3 className="font-semibold mb-3">Security</h3>
          <button className="text-sm border border-white/20 px-4 py-2 rounded-full">Change Password</button>
        </div>
      </div>
    </div>
  );
}
