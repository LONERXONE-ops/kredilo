#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
if [ ! -d src ]; then echo "Run this from your ~/kredilo folder"; exit 1; fi
echo "Writing files..."
mkdir -p "$(dirname "src/components/Field.tsx")"
cat > "src/components/Field.tsx" <<'KREDILO_EOF_7731'
import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export const inputCls =
  'h-12 w-full rounded-2xl border border-white/12 bg-black/40 px-4 text-sm outline-none transition placeholder:text-white/30 focus:border-white/40 focus:bg-black/60';

// Labelled form row.
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-white/75">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-white/40">{hint}</span>}
    </div>
  );
}

// Card section with an icon header.
export function FormSection({ title, subtitle, icon, children }: { title: string; subtitle?: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#0e0e0e]">
      <div className="flex items-center gap-3 rounded-t-3xl border-b border-white/[0.06] bg-white/[0.03] px-5 py-3.5">
        {icon && <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white/80">{icon}</span>}
        <div>
          <h3 className="font-extrabold leading-tight">{title}</h3>
          {subtitle && <p className="text-xs text-white/45">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

// On/off switch.
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="flex w-full items-center justify-between gap-3 text-left">
      <span className="text-sm font-semibold text-white/80">{label}</span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-emerald-500' : 'bg-white/15'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

type Opt = { value: string; label: ReactNode };

// Custom on-brand dropdown. Keeps the same API as a styled <select> — pass <option> children —
// but renders a compact, consistent menu instead of the mobile browser's native picker.
export function SelectInput({
  value, onChange, ariaLabel, children, triggerClassName, align = 'left',
}: {
  value: string | number;
  onChange: (v: string) => void;
  ariaLabel: string;
  children: ReactNode;
  triggerClassName?: string;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const options: Opt[] = Children.toArray(children)
    .filter(isValidElement)
    .map((el) => {
      const p = (el as { props: { value?: unknown; children?: ReactNode } }).props;
      return { value: String(p.value ?? ''), label: p.children };
    });
  const current = options.find((o) => o.value === String(value));

  useEffect(() => {
    if (!open) return;
    const onDown = (e: Event) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const trigger = triggerClassName ?? `${inputCls} flex items-center justify-between gap-2 text-left`;

  return (
    <div className="relative" ref={ref}>
      <button type="button" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={trigger}>
        <span className="truncate">{current ? current.label : ''}</span>
        <ChevronDown size={16} className={`shrink-0 text-white/45 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          role="listbox"
          className={`absolute z-50 mt-2 max-h-64 min-w-full overflow-auto rounded-2xl border border-white/12 bg-[#161616] p-1.5 shadow-2xl shadow-black/60 ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {options.map((o) => {
            const selected = o.value === String(value);
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={selected}
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm transition ${selected ? 'bg-emerald-500/15 text-emerald-300' : 'text-white/80 hover:bg-white/10'}`}
              >
                <span className="truncate">{o.label}</span>
                {selected && <Check size={15} className="shrink-0" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
KREDILO_EOF_7731
echo "  src/components/Field.tsx"
mkdir -p "$(dirname "src/pages/admin/AdminTeam.tsx")"
cat > "src/pages/admin/AdminTeam.tsx" <<'KREDILO_EOF_7731'
import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Copy, Trash2, UserPlus } from 'lucide-react';
import { SectionHeader } from '../../components/SectionHeader';
import { SelectInput } from '../../components/Field';
import { apiRequest } from '../../lib/auth';

type Member = { id: string; email: string; role: string; createdAt: string };
type Invite = { id: string; email: string; role: string; expiresAt: string; createdAt: string };
type InviteRole = 'reviewer' | 'support';

const roleText: Record<string, string> = {
  owner: 'Owner: everything, including funding and settings',
  reviewer: 'Reviewer: reviews submissions and fraud flags',
  support: 'Support: read-only access to users',
};

export default function AdminTeam() {
  const [team, setTeam] = useState<{ members: Member[]; invites: Invite[] } | null>(null);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteRole>('reviewer');
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      setTeam(await apiRequest<{ members: Member[]; invites: Invite[] }>('/api/admin/team'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the team.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (fn: () => Promise<unknown>) => {
    setError('');
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  const sendInvite = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setLink('');
    setCopied(false);
    await act(async () => {
      const r = await apiRequest<{ inviteUrl: string }>('/api/admin/invites', { email, role });
      setLink(r.inviteUrl);
      setEmail('');
    });
    setBusy(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Team" info="Only the owner can add or remove admins. Every change is written to the audit log." />

      {error && <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}

      <section className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-xl font-extrabold"><UserPlus size={20} /> Invite an admin</h2>
        <form onSubmit={sendInvite} className="mt-4 space-y-3">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Their email address"
            className="h-12 w-full rounded-full border border-white/20 bg-black/40 px-5 text-sm outline-none placeholder:text-white/35 focus:border-white/50"
          />
          <SelectInput
            value={role}
            onChange={(v) => setRole(v as InviteRole)}
            ariaLabel="Role"
            triggerClassName="h-12 w-full rounded-full border border-white/20 bg-black/40 px-5 text-sm outline-none flex items-center justify-between gap-2 text-left"
          >
            <option value="reviewer">Reviewer</option>
            <option value="support">Support</option>
          </SelectInput>
          <p className="text-xs text-white/45">{roleText[role]}</p>
          <button disabled={busy} className="min-h-12 w-full rounded-full bg-white text-sm font-bold text-black hover:bg-white/90 disabled:opacity-60">
            {busy ? 'Creating...' : 'Create invitation link'}
          </button>
        </form>

        {link && (
          <div className="mt-4 rounded-2xl border border-white/15 bg-white/[0.04] p-4">
            <p className="text-sm font-bold">Send this link to them. It is shown only once and works for 7 days.</p>
            <p className="mt-2 break-all rounded-xl bg-black/50 p-3 text-xs text-white/80">{link}</p>
            <button onClick={copy} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/25 px-5 text-sm font-bold hover:bg-white/5">
              <Copy size={16} /> {copied ? 'Copied' : 'Copy link'}
            </button>
            <p className="mt-2 text-xs text-white/45">They must sign in with this exact email address, and verify it, to accept.</p>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5 sm:p-6">
        <h2 className="text-xl font-extrabold">Admins</h2>
        <div className="mt-3 divide-y divide-white/5">
          {team?.members.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="truncate font-bold">{m.email}</div>
                <div className="text-xs text-white/45">{m.role === 'owner' ? 'Owner' : m.role === 'reviewer' ? 'Reviewer' : 'Support'}</div>
              </div>
              {m.role !== 'owner' && (
                <div className="flex items-center gap-2">
                  <SelectInput
                    value={m.role}
                    ariaLabel={`Role for ${m.email}`}
                    onChange={(v) => act(() => apiRequest('/api/admin/team/role', { userId: m.id, role: v }))}
                    align="right"
                    triggerClassName="h-10 rounded-full border border-white/20 bg-black/40 px-4 text-sm outline-none flex items-center justify-between gap-2"
                  >
                    <option value="reviewer">Reviewer</option>
                    <option value="support">Support</option>
                  </SelectInput>
                  <button
                    aria-label={`Remove ${m.email}`}
                    onClick={() => window.confirm(`Remove admin access for ${m.email}?`) && act(() => apiRequest('/api/admin/team/remove', { userId: m.id }))}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
          {!team && !error && <p className="py-3 text-sm text-white/45">Loading...</p>}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5 sm:p-6">
        <h2 className="text-xl font-extrabold">Pending invitations</h2>
        <div className="mt-3 divide-y divide-white/5">
          {team?.invites.map((i) => (
            <div key={i.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="truncate font-bold">{i.email}</div>
                <div className="text-xs text-white/45">{i.role === 'reviewer' ? 'Reviewer' : 'Support'} · expires {new Date(i.expiresAt).toLocaleDateString()}</div>
              </div>
              <button onClick={() => act(() => apiRequest('/api/admin/invites/revoke', { id: i.id }))} className="min-h-10 rounded-full border border-white/20 px-4 text-sm font-bold hover:bg-white/5">
                Revoke
              </button>
            </div>
          ))}
          {team && team.invites.length === 0 && <p className="py-3 text-sm text-white/45">No pending invitations.</p>}
        </div>
      </section>
    </div>
  );
}
KREDILO_EOF_7731
echo "  src/pages/admin/AdminTeam.tsx"
mkdir -p "$(dirname "src/pages/FeaturedTasks.tsx")"
cat > "src/pages/FeaturedTasks.tsx" <<'KREDILO_EOF_7731'
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Clock, Coins, Search } from 'lucide-react';
import { mockTasks } from '../lib/mockData';
import { categoryIcon } from '../components/TaskCard';
import { SelectInput } from '../components/Field';

export default function FeaturedTasks() {
  const [params] = useSearchParams();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(params.get('category') ?? 'All');
  const categories = ['All', ...Array.from(new Set(mockTasks.map((t) => t.category)))];

  const list = mockTasks.filter(
    (t) => (category === 'All' || t.category === category) && t.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="relative overflow-hidden">
      <div className="light-beam pointer-events-none absolute inset-y-0 right-0 w-full lg:w-[60%]" />
      <div className="relative mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid items-end gap-6 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-bold text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Task Marketplace</span>
            <h1 className="mt-4 text-[2.6rem] font-extrabold leading-[1.05] sm:text-6xl">Featured Tasks</h1>
            <p className="mt-4 max-w-md text-lg text-white/60">
              Complete simple tasks and earn kreds.
            </p>
          </div>
          <div className="space-y-3">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/45" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks..."
                className="h-14 w-full rounded-full border border-white/20 bg-black/40 pl-12 pr-4 text-sm outline-none transition placeholder:text-white/35 focus:border-emerald-400/50"
              />
            </div>
            <SelectInput
              value={category}
              onChange={setCategory}
              ariaLabel="Category"
              align="right"
              triggerClassName="h-11 rounded-full border border-white/20 bg-black/40 px-4 text-sm font-semibold outline-none flex items-center justify-between gap-2"
            >
              {categories.map((c) => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
            </SelectInput>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((t) => {
            const Icon = categoryIcon[t.category];
            return (
              <div key={t.id} className="flex flex-col rounded-[1.75rem] border border-white/15 bg-white/[0.02] p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10"><Icon size={26} strokeWidth={1.7} /></span>
                  <div className="min-w-0 flex-1">
                    <span className="rounded-full border border-white/20 px-2.5 py-0.5 text-[11px] font-bold">{t.category}</span>
                    <h2 className="mt-1.5 text-lg font-extrabold leading-snug">{t.title}</h2>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-5 text-sm font-bold">
                  <span className="flex items-center gap-1.5 text-emerald-400"><Coins size={17} /> {t.reward} kreds</span>
                  <span className="flex items-center gap-1.5 text-white/70"><Clock size={16} /> {t.timeMinutes} mins</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {t.requirements.slice(0, 2).map((r) => <span key={r} className="rounded-full border border-white/15 px-3 py-1 text-xs">{r}</span>)}
                  {t.requirements.length > 2 && <span className="rounded-full border border-white/15 px-3 py-1 text-xs">+{t.requirements.length - 2} more</span>}
                </div>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-white/55">{t.description}</p>
                <Link to={`/dashboard/tasks/${t.id}`} className="mt-4 inline-flex min-h-11 items-center gap-2 self-end rounded-full border border-white/25 px-5 text-sm font-bold hover:bg-white/5">
                  View Task <ArrowRight size={16} />
                </Link>
              </div>
            );
          })}
        </div>
        {list.length === 0 && <p className="mt-8 rounded-3xl border border-white/10 p-10 text-center text-white/45">No tasks match your search.</p>}
      </div>
    </div>
  );
}
KREDILO_EOF_7731
echo "  src/pages/FeaturedTasks.tsx"
echo
echo "Building frontend to verify..."
npm run build
echo
echo "✅ Build OK — dropdowns applied. Now: git add -A && git commit -m \"fix: custom dropdowns for selects\" && git push"
