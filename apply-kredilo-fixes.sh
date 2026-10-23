#!/usr/bin/env bash
# Kredilo fixes: "Task done"/"Pending review" tag on task tiles, and avatar upload
# now shows an error instead of failing silently. Run from the repo root:
#   cd ~/kredilo && bash apply-kredilo-fixes.sh
set -euo pipefail
if [ ! -f package.json ] || [ ! -d src ]; then
  echo "Run this from the kredilo repo root (where package.json and src/ live)." >&2
  exit 1
fi
echo "Writing files..."
mkdir -p "src/pages/dashboard"
cat > "src/pages/dashboard/Dashboard.tsx" <<'KREDILO_FIX_EOF'
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, Gamepad2, ImageIcon, ListChecks, Search, Sparkles, Wallet as WalletIcon } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { getWallet, listMySubmissions, listTasks, statusLabel } from '../../lib/tasks';
import type { MySubmission, Task, Wallet } from '../../lib/tasks';
import { Tabs } from '../../components/Tabs';
import { Kred } from '../../components/Kred';
import { EmptyState } from '../../components/EmptyState';

type Tab = 'explore' | 'mine';

const statusChip: Record<MySubmission['status'], string> = {
  in_progress: 'bg-white/10 text-white/70',
  pending_review: 'bg-amber-400/15 text-amber-300',
  approved: 'bg-emerald-500/15 text-emerald-400',
  rejected: 'bg-red-500/15 text-red-300',
};

const proofLabel = (t: Task) =>
  t.proofType === 'screenshot' ? 'Screenshot proof' : t.proofType === 'none' ? 'No proof needed' : t.proofType === 'link' ? 'Link proof' : 'Proof required';

function TaskTile({ task, status }: { task: Task; status?: MySubmission['status'] }) {
  return (
    <Link
      to={`/dashboard/tasks/${task.id}`}
      className={`pressable group block overflow-hidden rounded-3xl border border-white/10 bg-[#0e0e0e] transition hover:border-white/25 ${status === 'approved' ? 'opacity-80' : ''}`}
    >
      {/* Image-forward banner, like the games cards — shown upfront so doers see it without opening */}
      <div className="relative aspect-[16/7] w-full overflow-hidden bg-gradient-to-br from-white/[0.07] to-transparent">
        {task.photo ? (
          <img
            src={`/api/uploads?file=${encodeURIComponent(task.photo)}`}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/15">
            <ImageIcon size={34} strokeWidth={1.4} />
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">{task.category}</span>
          <span className="rounded-full bg-emerald-500/80 px-2.5 py-1 text-[11px] font-bold text-black backdrop-blur">{task.remaining} left</span>
        </div>
        {status === 'approved' && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[11px] font-bold text-black backdrop-blur"><Check size={12} /> Task done</span>
        )}
        {status === 'pending_review' && (
          <span className="absolute right-3 top-3 rounded-full bg-amber-400/90 px-2.5 py-1 text-[11px] font-bold text-black backdrop-blur">Pending review</span>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-extrabold">{task.title}</h3>
          <div className="mt-1 flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5 font-extrabold text-emerald-400"><Kred size={15} /> {task.reward}</span>
            <span className="text-white/45">{proofLabel(task)}</span>
          </div>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 transition group-hover:bg-white group-hover:text-black">
          <ArrowRight size={18} />
        </span>
      </div>
    </Link>
  );
}

function ExploreList() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [myStatus, setMyStatus] = useState<Record<string, MySubmission['status']>>({});

  useEffect(() => {
    listTasks().then(setTasks).catch((e) => setError(e instanceof Error ? e.message : 'Could not load tasks.'));
    // Tasks the user has submitted or finished sink to the bottom of every tab; ones they
    // only started (in_progress) stay on top so they can still finish them. The status also
    // drives the "Task done" / "Pending review" tag on each tile.
    listMySubmissions()
      .then((subs) => setMyStatus(Object.fromEntries(subs.map((s) => [s.taskId, s.status]))))
      .catch(() => { /* ordering + tags are best-effort */ });
  }, []);

  if (error) return <p className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">{error}</p>;
  if (!tasks)
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => <div key={i} className="skeleton h-56 rounded-3xl" />)}
      </div>
    );

  const categories = ['All', ...Array.from(new Set(tasks.map((t) => t.category)))];
  const filtered = tasks.filter((t) => (category === 'All' || t.category === category) && t.title.toLowerCase().includes(search.toLowerCase()));
  // A task counts as "done" (sinks to the bottom) once it has any submission that isn't still in progress.
  const isDone = (id: string) => myStatus[id] !== undefined && myStatus[id] !== 'in_progress';
  // Stable sort keeps the newest-first order within each group; done tasks move last.
  const ordered = [...filtered].sort((a, b) => Number(isDone(a.id)) - Number(isDone(b.id)));

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks..."
          className="h-12 w-full rounded-full border border-white/10 bg-[#0e0e0e] pl-11 pr-4 text-sm outline-none transition placeholder:text-white/35 focus:border-white/30"
        />
      </div>
      {categories.length > 2 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-bold transition active:scale-95 ${category === c ? 'border-white bg-white text-black' : 'border-white/15 text-white/70 hover:border-white/40'}`}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      {filtered.length === 0 ? (
        tasks.length === 0 ? (
          <EmptyState icon={Sparkles} title="No tasks yet" text="New tasks are added regularly. Check back soon — or earn some kreds with a game while you wait." action={{ to: '/dashboard/games', label: 'Play games' }} />
        ) : (
          <EmptyState icon={Search} title="No matches" text="No tasks match your search. Try a different word or category." />
        )
      ) : (
        <div className="stagger grid gap-3 sm:grid-cols-2">
          {ordered.map((t) => <TaskTile key={t.id} task={t} status={myStatus[t.id]} />)}
        </div>
      )}
    </div>
  );
}

function MyTasksList() {
  const [subs, setSubs] = useState<MySubmission[] | null>(null);
  useEffect(() => {
    listMySubmissions().then(setSubs).catch(() => setSubs([]));
  }, []);
  if (!subs) return <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="skeleton h-24 rounded-3xl" />)}</div>;
  if (subs.length === 0) return <EmptyState icon={ListChecks} title="No tasks started yet" text="Pick a task from Explore and your progress will show up here." action={{ to: '/dashboard', label: 'Explore tasks' }} />;
  return (
    <div className="stagger space-y-3">
      {subs.map((s) => (
        <Link key={s.id} to={`/dashboard/tasks/${s.taskId}`} className="pressable flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-[#0e0e0e] p-5 transition hover:border-white/25">
          <div className="min-w-0">
            <h3 className="truncate font-extrabold">{s.title}</h3>
            <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-emerald-400"><Kred size={14} /> {s.reward}</div>
            {s.rejectReason && <p className="mt-1 text-xs text-red-400">Reason: {s.rejectReason}</p>}
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusChip[s.status]}`}>{statusLabel[s.status]}</span>
        </Link>
      ))}
    </div>
  );
}

// The emerald hero — balance up top, stat tiles below, styled like the referral card.
function BalanceHero({ user, wallet }: { user: { username: string } | null; wallet: Wallet | null }) {
  const balance = wallet?.balanceTokens ?? 0;
  const balanceNaira = wallet?.balanceNaira ?? 0;
  const tasks = wallet?.tasksThisCycle ?? 0;
  const earned = wallet?.transactions.filter((t) => t.amount > 0).reduce((a, b) => a + b.amount, 0) ?? 0;
  const rate = wallet?.rate;
  const earnedNaira = rate && rate.tokens > 0 ? Math.floor((earned * rate.naira) / rate.tokens) : 0;

  return (
    <section className="animate-[fadeup_320ms_ease-out] overflow-hidden rounded-[1.9rem] border border-emerald-400/15 bg-gradient-to-br from-emerald-500/[0.16] via-emerald-500/[0.05] to-transparent p-6 sm:p-7">
      <div>
        <p className="text-sm text-white/55">Good to see you again,</p>
        <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">{user?.username} 👋</h1>
      </div>

      <div className="mt-6">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300/80">
          <WalletIcon size={13} /> Available balance
        </div>
        <div className="mt-1.5 flex flex-wrap items-end gap-x-3 gap-y-1">
          <span className="flex items-center gap-2 text-5xl font-extrabold leading-none sm:text-6xl">
            {balance.toLocaleString()} <Kred size={32} className="text-emerald-400" />
          </span>
          <span className="pb-1 text-sm font-semibold text-white/50">≈ ₦{balanceNaira.toLocaleString()}</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-black/25 p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-xl font-extrabold text-emerald-400">{earned.toLocaleString()} <Kred size={15} /></div>
          <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-white/40">Total earned</div>
          <div className="text-[10px] text-white/30">≈ ₦{earnedNaira.toLocaleString()}</div>
        </div>
        <div className="rounded-2xl bg-black/25 p-4 text-center">
          <div className="text-xl font-extrabold">{tasks.toLocaleString()}</div>
          <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-white/40">Tasks this cycle</div>
          <div className="text-[10px] text-white/30">completed</div>
        </div>
      </div>

      <Link
        to="/dashboard/wallet"
        className="pressable mt-5 flex min-h-12 items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black hover:bg-white/90"
      >
        <WalletIcon size={16} /> Open Wallet <ArrowRight size={15} />
      </Link>
    </section>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'mine' ? 'mine' : 'explore';
  const setTab = (t: Tab) => setParams(t === 'explore' ? {} : { tab: t }, { replace: true });

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const load = useCallback(() => {
    getWallet().then(setWallet).catch(() => setWallet(null));
  }, []);
  useEffect(load, [load]);

  return (
    <div className="space-y-8">
      <BalanceHero user={user} wallet={wallet} />

      <section className="space-y-4">
        <Tabs
          tabs={[{ id: 'explore' as Tab, label: 'Explore Tasks' }, { id: 'mine' as Tab, label: 'My Tasks' }]}
          value={tab}
          onChange={setTab}
        />
        {tab === 'explore' ? <ExploreList /> : <MyTasksList />}
      </section>

      <Link to="/dashboard/games" className="pressable flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-gradient-to-r from-white/[0.06] to-transparent p-5 transition hover:border-white/25">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10"><Gamepad2 size={24} /></div>
          <div>
            <div className="font-extrabold">Play Games, Earn Kreds</div>
            <div className="text-sm text-white/55">Snake, Memory Match, Reaction Test and Trivia Quiz.</div>
          </div>
        </div>
        <ArrowRight size={20} className="shrink-0" />
      </Link>
    </div>
  );
}
KREDILO_FIX_EOF
echo "  src/pages/dashboard/Dashboard.tsx"
mkdir -p "src/pages/dashboard"
cat > "src/pages/dashboard/Profile.tsx" <<'KREDILO_FIX_EOF'
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BadgeCheck, Bell, Camera, Check, ChevronRight, Copy, FileText, Gift, LifeBuoy, LogOut, Megaphone, MessageCircle, Pencil, ShieldCheck, Share2, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { apiRequest, changeUsername, removeAvatar, uploadAvatar, useAuth } from '../../lib/auth';
import { Avatar } from '../../components/Avatar';
import { Kred } from '../../components/Kred';
import { SocialLinks } from '../../components/SocialLinks';
import { configuredSocials } from '../../lib/socials';
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
          {copied === 'link' ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy link</>}
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
  const [avatarErr, setAvatarErr] = useState('');
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameErr, setNameErr] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [viewAvatar, setViewAvatar] = useState(false);

  useEffect(() => {
    if (!viewAvatar) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setViewAvatar(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [viewAvatar]);

  if (!user) return null;

  const onAvatar = async (file: File | undefined) => {
    if (!file) return;
    setAvatarBusy(true); setAvatarErr('');
    try { await uploadAvatar(await fileToDataUrl(file, 512)); await refresh(); }
    catch (e) { setAvatarErr(e instanceof Error ? e.message : 'Could not upload that photo. Please try a JPG or PNG under 5 MB.'); }
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
            {user.avatar ? (
              <button type="button" onClick={() => setViewAvatar(true)} aria-label="View profile photo" className="pressable block rounded-full">
                <Avatar src={user.avatar} name={user.username} size={64} />
              </button>
            ) : (
              <Avatar src={user.avatar} name={user.username} size={64} />
            )}
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
                {user.role !== 'user' && <BadgeCheck size={17} className="shrink-0 text-emerald-400" aria-label="Admin" />}
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
        {avatarErr && <p className="mt-3 text-xs text-red-400">{avatarErr}</p>}

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

      {configuredSocials().length > 0 && (
        <div className="flex flex-col items-center gap-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-white/40">Follow Kredilo</span>
          <SocialLinks />
        </div>
      )}

      <button
        onClick={async () => { await logout(); navigate('/'); }}
        className="pressable flex min-h-14 w-full items-center justify-center gap-2 rounded-full border border-white/20 text-sm font-bold hover:bg-white/5"
      >
        <LogOut size={18} /> Log out
      </button>

      {viewAvatar && user.avatar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-6 animate-[fadein_160ms_ease-out]" onClick={() => setViewAvatar(false)}>
          <button type="button" aria-label="Close" onClick={() => setViewAvatar(false)} className="pressable absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white hover:bg-white/10">
            <X size={22} />
          </button>
          <img src={user.avatar} alt="Your profile photo" onClick={(e) => e.stopPropagation()} className="max-h-[85vh] max-w-full rounded-3xl object-contain animate-[popin_200ms_ease-out]" />
        </div>
      )}
    </div>
  );
}
KREDILO_FIX_EOF
echo "  src/pages/dashboard/Profile.tsx"

echo ""
echo "Done. Next:"
echo "  1) cd server && npm test      # expect 78 pass"
echo "  2) cd ..     && npm run build"
echo "  3) git add -A && git commit -m 'task-done tag + avatar upload error feedback' && git push"
