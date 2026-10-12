import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeft, ShieldX, TriangleAlert } from 'lucide-react';
import { Logo } from './Logo';
import { adminNav } from '../lib/adminSections';
import { canSee } from '../lib/adminAccess';
import { useAuth } from '../lib/auth';

function Denied({ text, to, action }: { text: string; to: string; action: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <ShieldX size={48} className="text-white/50" />
      <h1 className="text-3xl font-extrabold">Access denied</h1>
      <p className="max-w-sm text-white/55">{text}</p>
      <Link to={to} className="mt-2 inline-flex min-h-12 items-center rounded-full bg-white px-7 text-sm font-bold text-black">{action}</Link>
    </div>
  );
}

export function AdminLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#050505] text-sm text-white/50">Loading...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (user.role === 'user') {
    return (
      <div className="min-h-screen bg-[#050505] text-white">
        <Denied text="This area is for Kredilo admins only." to="/dashboard" action="Back to dashboard" />
      </div>
    );
  }

  const section = location.pathname.replace(/^\/admin\/?/, '').split('/')[0];
  const allowed = canSee(user.role, section);

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#050505]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Logo className="h-6 w-auto text-white" />
            <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-extrabold uppercase text-black">{user.role}</span>
          </div>
          <Link to="/dashboard" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-white/60 hover:text-white">
            <ArrowLeft size={16} /> Back to app
          </Link>
        </div>
        <nav aria-label="Admin" className="mx-auto max-w-6xl overflow-x-auto px-4 pb-3 sm:px-6 lg:px-8">
          <div className="flex w-max gap-1.5">
            {adminNav.filter((n) => canSee(user.role, n.path)).map((n) => (
              <NavLink
                key={n.path}
                to={n.path ? `/admin/${n.path}` : '/admin'}
                end={n.path === ''}
                className={({ isActive }) =>
                  `inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold transition ${
                    isActive ? 'border-white bg-white text-black' : 'border-white/15 text-white/65 hover:text-white'
                  }`
                }
              >
                <n.icon size={16} /> {n.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <p className="mb-5 flex items-center gap-2 text-xs text-white/35">
          <TriangleAlert size={13} className="shrink-0" /> The server enforces every permission — screens only hide what your role can’t use.
        </p>
        <div className="animate-[fadeup_320ms_ease-out]">
          {allowed ? <Outlet /> : <Denied text="Your role does not include this section." to="/admin" action="Back to overview" />}
        </div>
      </main>
    </div>
  );
}
