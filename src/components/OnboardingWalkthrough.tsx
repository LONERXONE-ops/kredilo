import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, Coins, Landmark, ListChecks, Sparkles, X } from 'lucide-react';

// First-time "how it works" walkthrough. Shows once per browser for anyone who hasn't
// seen it yet — new signups AND existing users — then remembers it was dismissed.
// Re-openable anywhere via: window.dispatchEvent(new Event('kredilo:show-onboarding')).
const KEY = 'kredilo_onboarded_v1';

const steps = [
  { icon: Sparkles, title: 'Welcome to Kredilo 👋', text: "Here's how to turn your spare time into real cash — takes under a minute to learn." },
  { icon: ListChecks, title: '1. Pick a task', text: 'On your dashboard you’ll see simple tasks — follow a page, take a survey, try an app. Tap any task to start.' },
  { icon: Camera, title: '2. Complete it & submit proof', text: 'Do the steps, take a screenshot as proof, then submit it. Our team verifies every submission.' },
  { icon: Coins, title: '3. Earn kreds', text: 'Once your submission is verified, your kreds land in your wallet. Play games and invite friends to earn even more.' },
  { icon: Landmark, title: '4. Cash out', text: 'Withdraw your kreds straight to your Nigerian bank account when withdrawals open. That’s it!' },
];

export function OnboardingWalkthrough() {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(KEY) === '1'; } catch { /* storage unavailable */ }
    if (!seen) setOpen(true);
    const reopen = () => { setI(0); setOpen(true); };
    window.addEventListener('kredilo:show-onboarding', reopen);
    return () => window.removeEventListener('kredilo:show-onboarding', reopen);
  }, []);

  const close = () => {
    try { localStorage.setItem(KEY, '1'); } catch { /* storage unavailable */ }
    setOpen(false);
    // let the "What's New" announcement know it can show now (new signups)
    window.dispatchEvent(new Event('kredilo:onboarding-done'));
  };

  if (!open) return null;
  const step = steps[i];
  const Icon = step.icon;
  const last = i === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0e0e0e] p-6 shadow-2xl shadow-black/60 animate-[fadeup_280ms_ease-out]">
        <div className="flex justify-end">
          <button onClick={close} aria-label="Skip walkthrough" className="flex h-9 w-9 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col items-center px-2 pb-1 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300"><Icon size={30} /></span>
          <h2 className="mt-5 text-xl font-extrabold">{step.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/60">{step.text}</p>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5">
          {steps.map((_, k) => (
            <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? 'w-5 bg-emerald-400' : 'w-1.5 bg-white/20'}`} />
          ))}
        </div>

        <div className="mt-6 flex items-center gap-3">
          {i > 0 ? (
            <button onClick={() => setI(i - 1)} className="flex min-h-12 items-center gap-1.5 rounded-full border border-white/20 px-5 text-sm font-bold text-white/80 transition hover:bg-white/5">
              <ArrowLeft size={16} /> Back
            </button>
          ) : (
            <button onClick={close} className="min-h-12 rounded-full px-5 text-sm font-bold text-white/50 transition hover:text-white">Skip</button>
          )}
          <button onClick={() => (last ? close() : setI(i + 1))} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-emerald-500 text-sm font-bold text-black transition hover:bg-emerald-400">
            {last ? 'Start earning' : 'Next'} {!last && <ArrowRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
