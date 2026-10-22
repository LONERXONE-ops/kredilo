import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, Sparkles, X } from 'lucide-react';

// One-time "What's New" announcement. Shows once per browser for every signed-in user
// (new signups see it right after the welcome walkthrough), stays dismissed after they
// close it, and automatically stops showing for everyone once EXPIRES passes.
// Bump KEY to v2/v3 for the next announcement so returning users see it again.
// Re-openable anywhere via: window.dispatchEvent(new Event('kredilo:show-whatsnew')).
const KEY = 'kredilo_whatsnew_v1';
const ONBOARD_KEY = 'kredilo_onboarded_v1';
// Runs for one week. After this moment it never shows again (change the date for a new run).
const EXPIRES = Date.parse('2026-10-30T00:00:00+01:00');

const points = [
  '3 new daily games: Color Match, Math Sprint and Tap Tiles',
  'Every game now has its own polished page',
  'A fresh look with more of that signature emerald glow',
  'Smoother bottom navigation across the whole app',
];

export function WhatsNew() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (Date.now() >= EXPIRES) return; // window closed for everyone
    let dismissed = false;
    let onboarded = false;
    try {
      dismissed = localStorage.getItem(KEY) === '1';
      onboarded = localStorage.getItem(ONBOARD_KEY) === '1';
    } catch { /* storage unavailable */ }

    const show = () => setOpen(true);
    window.addEventListener('kredilo:show-whatsnew', show);

    if (!dismissed) {
      // Existing users see it now; brand-new users finish the walkthrough first,
      // then this opens when the walkthrough signals it is done.
      if (onboarded) setOpen(true);
      else window.addEventListener('kredilo:onboarding-done', show);
    }
    return () => {
      window.removeEventListener('kredilo:show-whatsnew', show);
      window.removeEventListener('kredilo:onboarding-done', show);
    };
  }, []);

  const close = () => {
    try { localStorage.setItem(KEY, '1'); } catch { /* storage unavailable */ }
    setOpen(false);
  };

  const tryGames = () => {
    close();
    navigate('/dashboard/games');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-emerald-400/20 bg-[#0e0e0e] shadow-2xl shadow-black/60 animate-[fadeup_280ms_ease-out]">
        <div className="relative">
          <img src="/whats-new.jpg" alt="What's New on Kredilo" className="aspect-square w-full object-cover" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0e0e0e] to-transparent" />
          <button
            onClick={close}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white/80 backdrop-blur transition hover:bg-black/70 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-6">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-300">
            <Sparkles size={16} /> Fresh update, just landed
          </div>
          <ul className="mt-3 space-y-2.5">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm leading-relaxed text-white/75">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
                {p}
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-center gap-3">
            <button onClick={close} className="min-h-12 rounded-full px-5 text-sm font-bold text-white/50 transition hover:text-white">
              Maybe later
            </button>
            <button
              onClick={tryGames}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-emerald-500 text-sm font-bold text-black transition hover:bg-emerald-400"
            >
              <Gamepad2 size={18} /> Try new games
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
