import { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { claimGame, getGamesStatus } from '../lib/games';
import { Kred } from './Kred';

// Shown when a game round ends. Lets the player claim the day's kreds (once per game per day).
export function GameResult({ game, score, headline }: { game: string; score: number; headline: string }) {
  const [cap, setCap] = useState<number | null>(null);
  const [claimedToday, setClaimedToday] = useState<number | null>(null);
  const [justEarned, setJustEarned] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    getGamesStatus().then((s) => {
      setCap(s.caps[game] ?? null);
      if (game in s.claimed) setClaimedToday(s.claimed[game]);
    }).catch(() => {});
  }, [game]);

  const preview = cap !== null ? Math.max(0, Math.min(cap, Math.round(score))) : Math.round(score);

  const claim = async () => {
    setBusy(true); setErr('');
    try {
      const r = await claimGame(game, score);
      if (r.already) setClaimedToday(r.kreds);
      else { setJustEarned(r.kreds); setClaimedToday(r.kreds); }
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not claim.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="mt-5 animate-[popin_280ms_ease-out] rounded-3xl border border-white/15 bg-gradient-to-br from-emerald-500/[0.12] to-transparent p-5 text-center">
      <p className="font-extrabold">{headline}</p>
      {justEarned !== null ? (
        <div className="mt-2 flex items-center justify-center gap-1.5 text-2xl font-extrabold text-emerald-400"><Check size={22} /> +{justEarned} <Kred size={18} /></div>
      ) : claimedToday !== null ? (
        <p className="mt-2 text-sm text-white/60">You already earned {claimedToday} kreds from this game today. Come back tomorrow 🌙</p>
      ) : (
        <>
          <div className="mt-2 flex items-center justify-center gap-1.5 text-sm text-white/60">This round: <span className="font-extrabold text-emerald-400">{preview}</span> <Kred size={13} /></div>
          <button onClick={claim} disabled={busy || preview <= 0} className="pressable mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-black disabled:opacity-50">
            {busy ? <Loader2 size={16} className="animate-spin" /> : null} {preview > 0 ? `Claim ${preview} kreds` : 'No kreds this round'}
          </button>
          <p className="mt-2 text-[11px] text-white/40">Once a day per game — play your best round, then claim.</p>
        </>
      )}
      {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
    </div>
  );
}
