import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home, ListChecks, Gamepad2, Bell, Wallet, User, Settings, HelpCircle, LogOut } from 'lucide-react';
import { Logo } from './Layout';
import { mockUser } from '../lib/mockData';

const sidebar = [
  { to: '/dashboard', icon: Home, label: 'Dashboard' },
  { to: '/dashboard/tasks', icon: ListChecks, label: 'Explore Tasks' },
  { to: '/dashboard/games', icon: Gamepad2, label: 'Games' },
  { to: '/dashboard/my-tasks', icon: ListChecks, label: 'My Tasks' },
  { to: '/dashboard/notifications', icon: Bell, label: 'Notifications' },
  { to: '/dashboard/wallet', icon: Wallet, label: 'Wallet' },
  { to: '/dashboard/profile', icon: User, label: 'Profile & Settings' },
];

export function DashboardLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-white/5 bg-[#0a0a0a] p-4">
        <div className="mb-8 px-2"><Logo /></div>
        <nav className="flex-1 space-y-1">
          {sidebar.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${
                  active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="pt-4 border-t border-white/5">
          <Link to="/" className="flex items-center gap-3 px-3 py-2 text-sm text-white/60 hover:text-white">
            <LogOut size={18} /> Log out
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-4 lg:px-8">
          <div className="lg:hidden"><Logo /></div>
          <div className="flex items-center gap-4 ml-auto">
            <Link to="/dashboard/notifications" className="relative p-2 hover:bg-white/5 rounded-lg">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </Link>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs">{mockUser.name[0]}</div>
              <div className="hidden sm:block">
                <div className="font-medium">{mockUser.name}</div>
                <div className="text-xs text-white/40">ID: {mockUser.id}</div>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
