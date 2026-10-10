import { Link, Outlet } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Logo } from './Logo';
import { BottomDock } from './BottomDock';
import { mockUser } from '../lib/mockData';

export function DashboardLayout() {
  return (
    <div className="relative min-h-screen bg-[#050505] text-white">
      <div className="light-beam pointer-events-none absolute inset-x-0 top-0 h-[28rem] opacity-60" />

      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#050505]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/dashboard" aria-label="Kredilo dashboard">
            <Logo className="h-6 w-auto text-white" />
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/dashboard/notifications" aria-label="Notifications" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10">
              <Bell size={20} />
            </Link>
            <Link to="/dashboard/profile" className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 hover:bg-white/10">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-extrabold">{mockUser.name[0]}</span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-sm font-bold">{mockUser.name}</span>
                <span className="block text-[11px] text-white/40">ID: {mockUser.id}</span>
              </span>
            </Link>
          </div>
        </div>
        <div className="border-t border-white/[0.06] bg-white/[0.04] px-4 py-1.5 text-center text-[11px] font-semibold text-white/60">
          Demo mode: sample data only. No real earnings or payments.
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-6xl px-4 pb-36 pt-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      <BottomDock />
    </div>
  );
}
