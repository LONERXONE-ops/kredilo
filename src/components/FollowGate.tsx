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
          return (
            <div key={p} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0e0e0e] p-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10"><SocialIcon name={p} size={20} /></span>
              <div className="min-w-0 flex-1">
                <div className="font-bold">{LABELS[p] ?? p}</div>
                <div className="flex items-center gap-1 text-xs text-emerald-400">+{status.bonus} <Kred size={11} /></div>
              </div>
              {done ? (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-400"><Check size={14} /> Done</span>
              ) : (
                <div className="flex shrink-0 items-center gap-2">
                  {url && (
                    <a href={url} target="_blank" rel="noreferrer noopener" className="pressable flex items-center gap-1 rounded-full border border-white/20 px-3 py-2 text-xs font-bold hover:bg-white/5">
                      <ExternalLink size={13} /> Follow
                    </a>
                  )}
                  <button onClick={() => claim(p)} disabled={busy === p} className="pressable rounded-full bg-white px-4 py-2 text-xs font-bold text-black disabled:opacity-50">
                    {busy === p ? <Loader2 size={13} className="animate-spin" /> : 'Claim'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

      <button onClick={onDone} disabled={!all} className="pressable mt-6 min-h-12 w-full rounded-full bg-white text-sm font-bold text-black disabled:opacity-40">
        {all ? 'Enter Kredilo →' : `Follow all ${status.platforms.length} to continue`}
      </button>
      <button onClick={onDone} className="mt-3 text-xs font-semibold text-white/40 underline underline-offset-4">Skip for now</button>
    </div>
  );
}
