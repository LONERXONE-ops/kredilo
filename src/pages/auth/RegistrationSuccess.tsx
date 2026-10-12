import { Link } from 'react-router-dom';
import { ArrowRight, Check, ClipboardCheck, Coins, Gamepad2, WalletCards } from 'lucide-react';
import { Logo } from '../../components/Logo';

const next = [
  { icon: ClipboardCheck, title: 'Complete Tasks', text: 'Follow the instructions and earn kreds.' },
  { icon: Gamepad2, title: 'Play Games', text: 'Enjoy browser games and daily challenges.' },
  { icon: Coins, title: 'Track Your Earnings', text: 'View your kred balance and transaction history.' },
  { icon: WalletCards, title: 'Withdrawals', text: 'Open on a date set by Kredilo.' },
];

export default function RegistrationSuccess() {
  return (
    <div className="relative overflow-hidden">
      <div className="light-beam pointer-events-none absolute inset-y-0 right-0 w-full lg:w-[60%]" />
      <div className="relative mx-auto grid max-w-5xl gap-5 px-5 py-10 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:py-14">
        <div className="flex flex-col items-center rounded-[2rem] border border-white/15 bg-[#0b0b0b]/80 px-6 py-10 text-center sm:px-10">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/70 bg-white/10 shadow-[0_0_60px_-10px_rgba(255,255,255,0.35)]">
            <Check size={48} strokeWidth={3} />
          </div>
          <h1 className="mt-6 text-4xl font-extrabold">Welcome to Kredilo!</h1>
          <p className="mt-1 text-lg font-bold">Your account has been created.</p>
          <p className="mt-3 max-w-xs text-white/60">You’re all set to start completing tasks, playing games, and earning kreds.</p>
          <Link to="/dashboard" className="mt-8 flex min-h-12 w-full max-w-sm items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black hover:bg-white/90">
            Continue to Dashboard <ArrowRight size={18} />
          </Link>
          <p className="mt-4 text-xs text-white/40">Next, verify your email using the link we sent. Withdrawals and cash rewards are not live yet.</p>
        </div>

        <div className="rounded-[2rem] border border-white/15 bg-[#0b0b0b]/80 p-6 sm:p-9">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[1.4rem] bg-gradient-to-br from-[#2a2a2a] to-[#0c0c0c] ring-1 ring-white/15">
            <Logo markOnly className="h-9 w-auto text-white" />
          </div>
          <h2 className="text-3xl font-extrabold">What’s Next?</h2>
          <p className="mt-1 text-sm text-white/60">Now that your account is ready, here’s what you can do:</p>
          <ul className="mt-6 space-y-4">
            {next.map((n) => (
              <li key={n.title} className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10"><n.icon size={22} /></span>
                <span>
                  <span className="block text-sm font-bold">{n.title}</span>
                  <span className="block text-xs text-white/55">{n.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
