import { Link, useLocation } from 'react-router-dom';
import { Gamepad2, LayoutDashboard, User, Wallet } from 'lucide-react';

// Four essentials only. Everything else lives inside one of these:
//  Dashboard = Explore Tasks + My Tasks, Wallet = Withdraw + Transactions,
//  Games = all games, Profile = settings + notifications + Help & Support.
const items = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, match: ['/dashboard/tasks', '/dashboard/my-tasks'], exact: '/dashboard' },
  { to: '/dashboard/wallet', label: 'Wallet', icon: Wallet, match: ['/dashboard/wallet'] },
  { to: '/dashboard/games', label: 'Games', icon: Gamepad2, match: ['/dashboard/games', '/games/'] },
  { to: '/dashboard/profile', label: 'Profile', icon: User, match: ['/dashboard/profile', '/dashboard/notifications'] },
];

export function BottomDock() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Main"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <div className="pointer-events-auto mx-auto flex max-w-md items-center justify-between rounded-full border border-white/10 bg-[#0c0c0c]/90 p-1.5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        {items.map((item) => {
          const active = item.exact === pathname || item.match.some((m) => pathname.startsWith(m));
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={`group relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-[1.3rem] px-2 text-[11px] font-bold transition-all duration-300 ${
                active ? 'text-black' : 'text-white/55 hover:text-white'
              }`}
            >
              {active && <span className="absolute inset-0 -z-0 rounded-[1.3rem] bg-emerald-400 shadow-[0_6px_22px_-6px_rgba(16,185,129,0.85)] animate-[popin_220ms_ease-out]" />}
              <item.icon size={20} strokeWidth={active ? 2.6 : 1.8} className={`relative z-10 transition-transform duration-300 ${active ? '-translate-y-0.5 scale-110' : 'group-active:scale-90'}`} />
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
