import { useEffect, useState } from 'react';
import { Check, ExternalLink, Loader2 } from 'lucide-react';
import { claimFollow, getFollowStatus } from '../lib/follow';
import type { FollowStatus } from '../lib/follow';
import { socialUrl } from '../lib/socials';
import { SocialIcon } from './SocialIcon';
import { Kred } from './Kred';
import { Logo } from './Logo';

const LABELS: Record<string, string> = { whatsapp: 'WhatsApp', x: 'X', instagram: 'Instagram', tiktok: 'TikTok', facebook: 'Facebook' };

export function FollowGate({ onDone }: { onDone: () => void }) {
  const [status, setStatus] = useState<FollowStatus | null>(null);
  const [opened, setOpened] = useState<string[]>([]); // platforms whose Follow link has been visited
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getFollowStatus().then(setStatus).catch(() => setStatus({ bonus: 10, platforms: ['whatsapp', 'x', 'instagram', 'tiktok', 'facebook'], claimed: [] }));
  }, []);

  if (!status) return <div className="mx-auto max-w-md"><div className="skeleton h-96 rounded-3xl" /></div>;

  const claim = async (p: string) => {
    setBusy(p); setError('');
    try { const r = await claimFollow(p); setStatus((s) => (s ? { ...s, claimed: r.claimed } : s)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not claim.'); }
    finally { setBusy(''); }
  };

  const markOpened = (p: string) => setOpened((o) => (o.includes(p) ? o : [...o, p]));
  const all = status.platforms.every((p) => status.claimed.includes(p));

  return (
    <div className="mx-auto max-w-md animate-[fadeup_320ms_ease-out] text-center">
      <Logo className="mx-auto h-8 w-auto text-white" />
      <h1 className="mt-6 text-3xl font-extrabold">Follow us to start</h1>
      <p className="mt-2 text-white/60">Follow Kredilo on each platform to unlock the app — and earn {status.bonus} kreds for each one.</p>

      <div className="mt-6 space-y-3 text-left">
        {status.platforms.map((p) => {
          const done = status.claimed.includes(p);
          const url = socialUrl(p);
          // Claim only unlocks once they've actually opened the social page (or if no link is set).
          const canClaim = opened.includes(p) || !url;
          return (
            <div key={p} className={`flex items-center gap-3 rounded-2xl border p-3 transition ${done ? 'border-emerald-400/30 bg-emerald-500/[0.07]' : 'border-white/10 bg-[#0e0e0e]'}`}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10"><SocialIcon name={p} size={20} /></span>
              <div className="min-w-0 flex-1">
                <div className="font-bold">{LABELS[p] ?? p}</div>
                <div className="flex items-center gap-1 text-xs text-emerald-400">+{status.bonus} <Kred size={11} /></div>
              </div>
              {done ? (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-400"><Check size={14} /> Done</span>
              ) : canClaim ? (
                <button
                  onClick={() => claim(p)}
                  disabled={busy === p}
                  className="pressable flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-5 py-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  {busy === p ? <Loader2 size={14} className="animate-spin" /> : `Claim +${status.bonus}`}
                </button>
              ) : (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer noopener"
                  onClick={() => markOpened(p)}
                  className="pressable flex shrink-0 items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-xs font-bold text-black hover:bg-white/90"
                >
                  <ExternalLink size={14} /> Follow
                </a>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

      <button onClick={onDone} disabled={!all} className="pressable mt-6 min-h-12 w-full rounded-full bg-white text-sm font-bold text-black disabled:opacity-40">
        {all ? 'Enter Kredilo →' : `Follow all ${status.platforms.length} to continue`}
      </button>
      <p className="mt-3 text-xs text-white/40">Tap Follow, then come back and Claim your kreds.</p>
    </div>
  );
}
