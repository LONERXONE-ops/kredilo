#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
if [ ! -d src ]; then echo "Run this from your ~/kredilo folder"; exit 1; fi
echo "Writing files..."
mkdir -p "$(dirname "src/components/OnboardingWalkthrough.tsx")"
cat > "src/components/OnboardingWalkthrough.tsx" <<'KREDILO_EOF_7788'
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, Coins, Landmark, ListChecks, Sparkles, X } from 'lucide-react';

// First-time "how it works" walkthrough. Shows once per browser for anyone who hasn't
// seen it yet — new signups AND existing users — then remembers it was dismissed.
// Re-openable anywhere via: window.dispatchEvent(new Event('kredilo:show-onboarding')).
const KEY = 'kredilo_onboarded_v1';

const steps = [
  { icon: Sparkles, title: 'Welcome to Kredilo 👋', text: "Here's how to turn your spare time into real cash — takes under a minute to learn." },
  { icon: ListChecks, title: '1. Pick a task', text: 'On your dashboard you’ll see simple tasks — follow a page, take a survey, try an app. Tap any task to start.' },
  { icon: Camera, title: '2. Complete it & submit proof', text: 'Do the steps, take a screenshot as proof, then submit it. Our team verifies every submission.' },
  { icon: Coins, title: '3. Earn kreds', text: 'Once your submission is verified, your kreds land in your wallet. Play games and invite friends to earn even more.' },
  { icon: Landmark, title: '4. Cash out', text: 'Withdraw your kreds straight to your Nigerian bank account when withdrawals open. That’s it!' },
];

export function OnboardingWalkthrough() {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(KEY) === '1'; } catch { /* storage unavailable */ }
    if (!seen) setOpen(true);
    const reopen = () => { setI(0); setOpen(true); };
    window.addEventListener('kredilo:show-onboarding', reopen);
    return () => window.removeEventListener('kredilo:show-onboarding', reopen);
  }, []);

  const close = () => {
    try { localStorage.setItem(KEY, '1'); } catch { /* storage unavailable */ }
    setOpen(false);
  };

  if (!open) return null;
  const step = steps[i];
  const Icon = step.icon;
  const last = i === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0e0e0e] p-6 shadow-2xl shadow-black/60 animate-[fadeup_280ms_ease-out]">
        <div className="flex justify-end">
          <button onClick={close} aria-label="Skip walkthrough" className="flex h-9 w-9 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col items-center px-2 pb-1 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300"><Icon size={30} /></span>
          <h2 className="mt-5 text-xl font-extrabold">{step.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/60">{step.text}</p>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5">
          {steps.map((_, k) => (
            <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? 'w-5 bg-emerald-400' : 'w-1.5 bg-white/20'}`} />
          ))}
        </div>

        <div className="mt-6 flex items-center gap-3">
          {i > 0 ? (
            <button onClick={() => setI(i - 1)} className="flex min-h-12 items-center gap-1.5 rounded-full border border-white/20 px-5 text-sm font-bold text-white/80 transition hover:bg-white/5">
              <ArrowLeft size={16} /> Back
            </button>
          ) : (
            <button onClick={close} className="min-h-12 rounded-full px-5 text-sm font-bold text-white/50 transition hover:text-white">Skip</button>
          )}
          <button onClick={() => (last ? close() : setI(i + 1))} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-emerald-500 text-sm font-bold text-black transition hover:bg-emerald-400">
            {last ? 'Start earning' : 'Next'} {!last && <ArrowRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
KREDILO_EOF_7788
echo "  src/components/OnboardingWalkthrough.tsx"
mkdir -p "$(dirname "src/components/VerifyEmailBanner.tsx")"
cat > "src/components/VerifyEmailBanner.tsx" <<'KREDILO_EOF_7788'
import { useState } from 'react';
import { MailWarning } from 'lucide-react';
import { apiRequest, useAuth } from '../lib/auth';

// Persistent call-to-action shown to any signed-in user whose email isn't verified yet —
// including existing users. Disappears automatically once their email is verified.
export function VerifyEmailBanner() {
  const { user } = useAuth();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!user || user.emailVerified) return null;

  const resend = async () => {
    setBusy(true);
    try {
      await apiRequest('/api/auth/resend-verification', {});
      setSent(true);
    } catch {
      /* ignore — keep the banner up so they can try again */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-4 pt-3 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-2.5 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <MailWarning size={20} className="mt-0.5 shrink-0 text-amber-300" />
          <p className="text-sm leading-relaxed text-amber-100/90">
            <span className="font-bold text-amber-200">Verify your email</span> to secure your account and unlock withdrawals. Check your inbox (and spam) for the link.
          </p>
        </div>
        <button
          onClick={resend}
          disabled={busy || sent}
          className="shrink-0 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-amber-300 disabled:opacity-70"
        >
          {sent ? 'Email sent ✓' : busy ? 'Sending…' : 'Resend email'}
        </button>
      </div>
    </div>
  );
}
KREDILO_EOF_7788
echo "  src/components/VerifyEmailBanner.tsx"
mkdir -p "$(dirname "src/components/DashboardLayout.tsx")"
cat > "src/components/DashboardLayout.tsx" <<'KREDILO_EOF_7788'
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
          <main className={`relative mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 lg:px-8 ${isDock ? 'pb-36' : 'pb-16'} animate-[fadeup_320ms_ease-out]`}>
            <Outlet />
          </main>
          {isDock && <BottomDock />}
          {user.role === 'user' && <OnboardingWalkthrough />}
        </>
      )}
    </div>
  );
}
KREDILO_EOF_7788
echo "  src/components/DashboardLayout.tsx"
echo
echo "Building frontend to verify..."
npm run build
echo
echo "BUILD OK. Now run: git add -A && git commit -m \"feat: onboarding walkthrough + verify-email banner\" && git push"
