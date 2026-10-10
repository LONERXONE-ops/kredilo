import { Link } from 'react-router-dom';
import { Bell, ChevronRight, FileText, LifeBuoy, LogOut, MessageCircle, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { mockUser } from '../../lib/mockData';

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
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-4xl font-extrabold">Profile</h1>

      <div className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-2xl font-extrabold">{mockUser.name[0]}</div>
          <div className="min-w-0">
            <div className="text-lg font-extrabold">{mockUser.name}</div>
            <div className="truncate text-sm text-white/50">{mockUser.email}</div>
            <div className="mt-0.5 text-xs text-white/40">ID: {mockUser.id} · demo account</div>
          </div>
        </div>
        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-bold">Display Name</label>
            <input defaultValue={mockUser.name} className="h-12 w-full rounded-2xl border border-white/10 bg-black/50 px-4 text-sm outline-none focus:border-white/30" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">Email</label>
            <input defaultValue={mockUser.email} className="h-12 w-full rounded-2xl border border-white/10 bg-black/50 px-4 text-sm outline-none focus:border-white/30" />
          </div>
          <button className="min-h-12 rounded-full bg-white px-7 text-sm font-bold text-black">Save Changes</button>
          <p className="text-xs text-white/40">Saving is disabled in demo mode.</p>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#0e0e0e] px-5 py-2">
        <Row to="/dashboard/notifications" icon={Bell} title="Notifications" text="Task approvals, rejections and updates" />
        <Row to="/recover" icon={ShieldCheck} title="Security" text="Change or recover your password" />
      </div>

      <section id="help" className="rounded-3xl border border-white/10 bg-[#0e0e0e] px-5 py-2">
        <h2 className="pb-1 pt-3 text-sm font-extrabold uppercase tracking-wider text-white/45">Help &amp; Support</h2>
        <Row to="/faq" icon={LifeBuoy} title="FAQ" text="Answers about tasks, rewards and withdrawals" />
        <Row to="/contact" icon={MessageCircle} title="Contact Support" text="Report a problem or ask a question" />
        <Row to="/terms" icon={FileText} title="Terms of Service" text="The rules for using Kredilo" />
        <Row to="/privacy" icon={FileText} title="Privacy Policy" text="How your data is handled" />
      </section>

      <Link to="/" className="flex min-h-14 items-center justify-center gap-2 rounded-full border border-white/20 text-sm font-bold hover:bg-white/5">
        <LogOut size={18} /> Log out
      </Link>
    </div>
  );
}
