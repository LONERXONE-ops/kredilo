import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Gamepad2, ImageIcon, Search, Wallet as WalletIcon } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { getWallet, listMySubmissions, listTasks, statusLabel } from '../../lib/tasks';
import type { MySubmission, Task, Wallet } from '../../lib/tasks';
import { Tabs } from '../../components/Tabs';
import { Kred } from '../../components/Kred';

type Tab = 'explore' | 'mine';

const statusChip: Record<MySubmission['status'], string> = {
  in_progress: 'bg-white/10 text-white/70',
  pending_review: 'bg-amber-400/15 text-amber-300',
  approved: 'bg-emerald-500/15 text-emerald-400',
  rejected: 'bg-red-500/15 text-red-300',
};

const proofLabel = (t: Task) =>
  t.proofType === 'screenshot' ? 'Screenshot proof' : t.proofType === 'none' ? 'No proof needed' : t.proofType === 'link' ? 'Link proof' : 'Proof required';

function TaskTile({ task }: { task: Task }) {
  return (
    <Link
      to={`/dashboard/tasks/${task.id}`}
      className="pressable group block overflow-hidden rounded-3xl border border-white/10 bg-[#0e0e0e] transition hover:border-white/25"
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

  useEffect(() => {
    listTasks().then(setTasks).catch((e) => setError(e instanceof Error ? e.message : 'Could not load tasks.'));
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
        <p className="rounded-3xl border border-white/10 p-10 text-center text-sm text-white/45">No tasks match. Check back soon.</p>
      ) : (
        <div className="stagger grid gap-3 sm:grid-cols-2">
          {filtered.map((t) => <TaskTile key={t.id} task={t} />)}
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
  if (subs.length === 0) return <p className="rounded-3xl border border-white/10 p-10 text-center text-sm text-white/45">You haven’t started any tasks yet.</p>;
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
  const min = wallet?.minWithdrawalTokens ?? 2000;
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
          <div className="flex items-center justify-center gap-1 text-xl font-extrabold">{min.toLocaleString()} <Kred size={15} /></div>
          <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-white/40">Min withdrawal</div>
          <div className="text-[10px] text-white/30">to cash out</div>
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
