import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BadgeCheck, Bell, Camera, Check, ChevronRight, Copy, FileText, Gift, LifeBuoy, LogOut, Megaphone, MessageCircle, Pencil, ShieldCheck, Share2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { apiRequest, changeUsername, removeAvatar, uploadAvatar, useAuth } from '../../lib/auth';
import { Avatar } from '../../components/Avatar';
import { Kred } from '../../components/Kred';
import { fileToDataUrl } from '../../lib/tasks';
import { getReferral } from '../../lib/referral';
import type { ReferralInfo } from '../../lib/referral';

function Row({ to, icon: Icon, title, text }: { to: string; icon: LucideIcon; title: string; text: string }) {
  return (
    <Link to={to} className="pressable flex min-h-16 items-center gap-4 border-t border-white/5 py-3 first:border-t-0">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10"><Icon size={20} /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{title}</span>
        <span className="block text-sm text-white/50">{text}</span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-white/40" />
    </Link>
  );
}

function ReferralCard() {
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  useEffect(() => { getReferral().then(setInfo).catch(() => setInfo(null)); }, []);
  if (!info) return <div className="skeleton h-40 rounded-3xl" />;

  const link = `${window.location.origin}/signup?ref=${info.code}`;
  const copy = async (what: 'code' | 'link', value: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(what); setTimeout(() => setCopied(null), 1500); } catch { /* ignore */ }
  };
  const share = async () => {
    try { await navigator.share({ title: 'Join me on Kredilo', text: `Use my code ${info.code} to join Kredilo and earn kreds.`, url: link }); } catch { copy('link', link); }
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/[0.12] to-transparent p-6">
      <div className="flex items-center gap-2 text-sm font-bold text-emerald-300"><Gift size={18} /> Invite friends, earn {info.bonus} <Kred size={14} /></div>
      <p className="mt-1 text-sm text-white/55">You get {info.bonus} kreds each time someone you invite completes their first task.</p>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4">
        <div className="text-xs font-semibold text-white/45">Your referral code</div>
        <div className="mt-1 flex items-center justify-between gap-3">
          <div className="text-2xl font-extrabold tracking-[0.2em]">{info.code}</div>
          <button onClick={() => copy('code', info.code)} className="pressable flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-2 text-xs font-bold hover:bg-white/5">
            {copied === 'code' ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <button onClick={() => copy('link', link)} className="pressable flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/20 text-sm font-bold hover:bg-white/5">
          {copied === 'link' ? <><Check size={16} /> Link copied</> : <><Copy size={16} /> Copy invite link</>}
        </button>
        <button onClick={share} className="pressable flex min-h-11 items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black hover:bg-white/90">
          <Share2 size={16} /> Share
        </button>
      </div>

      <div className="mt-4 flex gap-3">
        <div className="flex-1 rounded-2xl bg-white/5 p-3 text-center">
          <div className="text-xl font-extrabold">{info.count}</div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-white/40">Invited</div>
        </div>
        <div className="flex-1 rounded-2xl bg-white/5 p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-xl font-extrabold text-emerald-400">{info.earned} <Kred size={15} /></div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-white/40">Earned</div>
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, logout, refresh } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameErr, setNameErr] = useState('');
  const [savingName, setSavingName] = useState(false);

  if (!user) return null;

  const onAvatar = async (file: File | undefined) => {
    if (!file) return;
    setAvatarBusy(true);
    try { await uploadAvatar(await fileToDataUrl(file, 512)); await refresh(); } catch { /* ignore */ }
    finally { setAvatarBusy(false); }
  };
  const clearAvatar = async () => { setAvatarBusy(true); try { await removeAvatar(); await refresh(); } finally { setAvatarBusy(false); } };

  const resend = async () => {
    setNote('');
    try { await apiRequest('/api/auth/resend-verification', {}); setNote('A new verification link has been sent.'); }
    catch (err) { setNote(err instanceof Error ? err.message : 'Could not send the link.'); }
  };

  const saveName = async () => {
    const u = newName.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(u)) return setNameErr('3-20 chars: lowercase letters, numbers or underscores.');
    setSavingName(true); setNameErr('');
    try { await changeUsername(u); await refresh(); setEditing(false); }
    catch (e) { setNameErr(e instanceof Error ? e.message : 'Could not update username.'); }
    finally { setSavingName(false); }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-4xl font-extrabold">Profile</h1>

      <div className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-6">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <Avatar src={user.avatar} name={user.username} size={64} />
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onAvatar(e.target.files?.[0])} />
            <button onClick={() => fileRef.current?.click()} disabled={avatarBusy} aria-label="Change photo" className="pressable absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black text-white disabled:opacity-50">
              <Camera size={14} />
            </button>
          </div>
          <div className="min-w-0 flex-1">
            {editing ? (
              <div>
                <div className="flex items-center gap-2">
                  <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={user.username} className="h-10 w-full rounded-xl border border-white/15 bg-black/40 px-3 text-sm outline-none focus:border-white/40" />
                  <button onClick={saveName} disabled={savingName} className="shrink-0 rounded-full bg-white px-4 py-2 text-xs font-bold text-black disabled:opacity-50">Save</button>
                  <button onClick={() => { setEditing(false); setNameErr(''); }} className="shrink-0 rounded-full border border-white/20 px-3 py-2 text-xs font-bold">Cancel</button>
                </div>
                {nameErr && <p className="mt-1 text-xs text-red-400">{nameErr}</p>}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="truncate text-lg font-extrabold">{user.username}</span>
                {user.emailVerified && <BadgeCheck size={17} className="shrink-0 text-emerald-400" aria-label="Verified" />}
                <button onClick={() => { setNewName(user.username); setEditing(true); }} aria-label="Edit username" className="pressable shrink-0 rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white"><Pencil size={14} /></button>
              </div>
            )}
            <div className="truncate text-sm text-white/50">{user.email}</div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-white/40">
              <span>ID: {user.id.slice(0, 8)} · {user.role === 'user' ? 'member' : user.role}</span>
              {user.avatar && <button onClick={clearAvatar} disabled={avatarBusy} className="font-bold text-white/50 underline underline-offset-4 disabled:opacity-50">Remove photo</button>}
            </div>
          </div>
        </div>

        {/* Verification notice ONLY while unverified */}
        {!user.emailVerified && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
            <ShieldCheck size={18} className="mt-0.5 shrink-0" />
            <div className="flex-1">
              Your email isn’t verified yet. Verify it to unlock rewards and withdrawals.
              <button onClick={resend} className="mt-2 block min-h-10 font-bold underline underline-offset-4">Send a new link</button>
              {note && <div className="mt-1 text-white/80">{note}</div>}
            </div>
          </div>
        )}

        {user.role !== 'user' && (
          <Link to="/admin" className="pressable mt-4 flex min-h-12 items-center justify-center rounded-full border border-white/20 text-sm font-bold hover:bg-white/5">
            Open Admin
          </Link>
        )}
      </div>

      <ReferralCard />

      <Link to="/dashboard/post" className="pressable flex min-h-16 items-center gap-4 rounded-3xl border border-white/10 bg-[#0e0e0e] px-5 py-3 hover:border-white/25">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10"><Megaphone size={20} /></span>
        <span className="min-w-0 flex-1"><span className="block font-bold">Post a Task</span><span className="block text-sm text-white/50">Pay to have Kredilo users do a task for you</span></span>
        <ChevronRight size={18} className="shrink-0 text-white/40" />
      </Link>

      <div className="rounded-3xl border border-white/10 bg-[#0e0e0e] px-5 py-2">
        <Row to="/dashboard/notifications" icon={Bell} title="Notifications" text="Task approvals, rejections and updates" />
        <Row to="/forgot-password" icon={ShieldCheck} title="Change password" text="Get a link to set a new password" />
      </div>

      <section id="help" className="rounded-3xl border border-white/10 bg-[#0e0e0e] px-5 py-2">
        <h2 className="pb-1 pt-3 text-sm font-extrabold uppercase tracking-wider text-white/45">Help &amp; Support</h2>
        <Row to="/faq" icon={LifeBuoy} title="FAQ" text="Answers about tasks, rewards and withdrawals" />
        <Row to="/contact" icon={MessageCircle} title="Contact Support" text="Report a problem or ask a question" />
        <Row to="/terms" icon={FileText} title="Terms of Service" text="The rules for using Kredilo" />
        <Row to="/privacy" icon={FileText} title="Privacy Policy" text="How your data is handled" />
      </section>

      <button
        onClick={async () => { await logout(); navigate('/'); }}
        className="pressable flex min-h-14 w-full items-center justify-center gap-2 rounded-full border border-white/20 text-sm font-bold hover:bg-white/5"
      >
        <LogOut size={18} /> Log out
      </button>
    </div>
  );
}
