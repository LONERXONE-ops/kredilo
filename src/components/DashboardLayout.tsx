import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import { Logo } from './Logo';
import { BottomDock } from './BottomDock';
import { useAuth } from '../lib/auth';
import { Avatar } from './Avatar';
import { getUnreadCount } from '../lib/notifications';
import { anySocialConfigured } from '../lib/socials';
import { getFollowStatus } from '../lib/follow';
import { FollowGate } from './FollowGate';
import { OnboardingWalkthrough } from './OnboardingWalkthrough';
import { VerifyEmailBanner } from './VerifyEmailBanner';

// The four sections that live in the bottom dock. Any other screen shows a back button instead.
const DOCK_ROUTES = ['/dashboard', '/dashboard/wallet', '/dashboard/games', '/dashboard/profile'];

export function DashboardLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  // null = still deciding; true = must complete the follow gate before using the app.
  const [gate, setGate] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    getUnreadCount().then(setUnread).catch(() => { /* ignore */ });
    const clear = () => setUnread(0);
    window.addEventListener('notifications-read', clear);
    return () => window.removeEventListener('notifications-read', clear);
  }, [user, location.pathname]);

  useEffect(() => {
    // Only gate regular users, and only once social pages are configured. Admins and
    // the un-configured state pass straight through so nobody is ever trapped.
    if (!user || user.role !== 'user' || !anySocialConfigured()) { setGate(false); return; }
    getFollowStatus()
      .then((s) => setGate(!s.platforms.every((p) => s.claimed.includes(p))))
      .catch(() => setGate(false));
  }, [user]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#050505] text-sm text-white/50">Loading...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const name = user.username ?? user.email.split('@')[0];
  const isDock = DOCK_ROUTES.includes(location.pathname);

  return (
    <div className="relative min-h-screen bg-[#050505] text-white">
      <div className="light-beam pointer-events-none absolute inset-x-0 top-0 h-[28rem] opacity-60" />

      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#050505]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
          {isDock ? (
            <Link to="/dashboard" aria-label="Kredilo dashboard" className="transition active:scale-95">
              <Logo className="h-6 w-auto text-white" />
            </Link>
          ) : (
            <button
              onClick={() => navigate(-1)}
              className="-ml-2 flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold text-white/80 transition hover:bg-white/10 hover:text-white active:scale-95"
            >
              <ArrowLeft size={18} /> Back
            </button>
          )}
          <div className="flex items-center gap-2">
            <Link to="/dashboard/notifications" aria-label="Notifications" className="relative flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-white/10 active:scale-90">
              <Bell size={20} />
              {unread > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 animate-[kpop_240ms_ease-out] items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-black">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>
            <Link to="/dashboard/profile" className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 transition hover:bg-white/10 active:scale-95">
              <Avatar src={user.avatar} name={name} size={36} />
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-sm font-bold">{name}</span>
                <span className="block text-[11px] text-white/40">ID: {user.id.slice(0, 8)}</span>
              </span>
            </Link>
          </div>
        </div>
      </header>

      {gate ? (
        <main className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
          <FollowGate onDone={() => setGate(false)} />
        </main>
      ) : (
        <>
          <VerifyEmailBanner />
          <main className={`relative mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 lg:px-8 ${isDock ? 'pb-[calc(8.5rem+env(safe-area-inset-bottom))]' : 'pb-16'} animate-[fadeup_320ms_ease-out]`}>
            <Outlet />
          </main>
          {isDock && <BottomDock />}
          {user.role === 'user' && <OnboardingWalkthrough />}
        </>
      )}
    </div>
  );
}
