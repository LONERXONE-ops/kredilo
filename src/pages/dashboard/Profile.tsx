import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, FileText, LifeBuoy, LogOut, MailCheck, Megaphone, MessageCircle, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { apiRequest, useAuth } from '../../lib/auth';

function Row({ to, icon: Icon, title, text }: { to: string; icon: LucideIcon; title: string; text: string }) {
  return (
    <Link to={to} className="flex min-h-16 items-center gap-4 border-t border-white/5 py-3 first:border-t-0">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10"><Icon size={20} /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{title}</span>
        <span className="block text-sm text-white/50">{text}</span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-white/40" />
    </Link>
  );
}

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [note, setNote] = useState('');
  if (!user) return null;
  const name = user.email.split('@')[0];

  const resend = async () => {
    setNote('');
    try {
      await apiRequest('/api/auth/resend-verification', {});
      setNote('A new verification link has been sent.');
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Could not send the link.');
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-4xl font-extrabold">Profile</h1>

      <div className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-2xl font-extrabold">{name[0]?.toUpperCase()}</div>
          <div className="min-w-0">
            <div className="truncate text-lg font-extrabold">{name}</div>
            <div className="truncate text-sm text-white/50">{user.email}</div>
            <div className="mt-0.5 text-xs text-white/40">ID: {user.id.slice(0, 8)} · {user.role === 'user' ? 'member' : user.role}</div>
          </div>
        </div>

        <div className={`mt-5 flex items-start gap-3 rounded-2xl border p-4 text-sm ${user.emailVerified ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' : 'border-amber-400/30 bg-amber-400/10 text-amber-200'}`}>
          <MailCheck size={18} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            {user.emailVerified ? (
              'Your email is verified.'
            ) : (
              <>
                Your email is not verified yet. Verify it to unlock rewards later.
                <button onClick={resend} className="mt-2 block min-h-10 font-bold underline underline-offset-4">Send a new link</button>
              </>
            )}
            {note && <div className="mt-1 text-white/80">{note}</div>}
          </div>
        </div>

        {user.role !== 'user' && (
          <Link to="/admin" className="mt-4 flex min-h-12 items-center justify-center rounded-full border border-white/20 text-sm font-bold hover:bg-white/5">
            Open Admin
          </Link>
        )}
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#0e0e0e] px-5 py-2">
        <Row to="/dashboard/notifications" icon={Bell} title="Notifications" text="Task approvals, rejections and updates" />
        <Row to="/forgot-password" icon={ShieldCheck} title="Change password" text="Get a link to set a new password" />
      </div>

      <Link to="/dashboard/post" className="flex min-h-16 items-center gap-4 rounded-3xl border border-white/10 bg-[#0e0e0e] px-5 hover:border-white/25">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10"><Megaphone size={20} /></span>
        <span className="min-w-0 flex-1"><span className="block font-bold">Post a Task</span><span className="block text-sm text-white/50">Pay to have Kredilo users do a task for you</span></span>
      </Link>

      <section id="help" className="rounded-3xl border border-white/10 bg-[#0e0e0e] px-5 py-2">
        <h2 className="pb-1 pt-3 text-sm font-extrabold uppercase tracking-wider text-white/45">Help &amp; Support</h2>
        <Row to="/faq" icon={LifeBuoy} title="FAQ" text="Answers about tasks, rewards and withdrawals" />
        <Row to="/contact" icon={MessageCircle} title="Contact Support" text="Report a problem or ask a question" />
        <Row to="/terms" icon={FileText} title="Terms of Service" text="The rules for using Kredilo" />
        <Row to="/privacy" icon={FileText} title="Privacy Policy" text="How your data is handled" />
      </section>

      <button
        onClick={async () => {
          await logout();
          navigate('/');
        }}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full border border-white/20 text-sm font-bold hover:bg-white/5"
      >
        <LogOut size={18} /> Log out
      </button>
    </div>
  );
}
