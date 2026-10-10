import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardCheck, Coins, Rocket, Search, ShieldCheck, UserPlus, Wallet } from 'lucide-react';

const steps = [
  { icon: UserPlus, title: 'Create an account.', text: 'Sign up with your email and create your Kredilo account in minutes.' },
  { icon: Search, title: 'Find an eligible task or game challenge.', text: 'Browse available tasks and games from different categories.' },
  { icon: ClipboardCheck, title: 'Complete the stated requirements.', text: 'Follow the instructions and meet the eligibility conditions.' },
  { icon: ShieldCheck, title: 'Wait for verification when required.', text: 'Some tasks need manual review. We’ll let you know once it’s verified.' },
  { icon: Coins, title: 'Receive eligible tokens.', text: 'Approved tasks and games credit tokens to your wallet.' },
  { icon: Wallet, title: 'Withdraw when it opens.', text: 'Withdrawals are not available yet. The planned minimum is 10,000 tokens.' },
];

export default function HowItWorks() {
  return (
    <div className="relative overflow-hidden">
      <div className="light-beam pointer-events-none absolute inset-y-0 right-0 w-full lg:w-[60%]" />
      <div className="relative mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full border border-white/25 px-4 py-1.5 text-sm font-bold">How It Works</span>
          <h1 className="mt-5 text-[2.6rem] font-extrabold leading-[1.05] sm:text-6xl">Simple Steps to Earn with Kredilo.</h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-white/60">
            Getting started is easy. Follow these steps to complete tasks and play games for tokens.
          </p>
        </div>

        <ol className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {steps.map((s, i) => (
            <li key={s.title} className="flex flex-col items-center rounded-[1.75rem] border border-white/15 bg-white/[0.02] px-5 py-7 text-center">
              <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10"><s.icon size={34} strokeWidth={1.6} /></span>
              <span className="mt-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-extrabold">{i + 1}</span>
              <h2 className="mt-3 text-lg font-extrabold leading-snug">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{s.text}</p>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex flex-col items-start gap-5 rounded-[1.75rem] border border-white/15 bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10"><Rocket size={26} /></span>
            <div>
              <div className="text-lg font-extrabold">Ready to get started?</div>
              <div className="text-sm text-white/55">Create your account and begin earning eligible tokens.</div>
            </div>
          </div>
          <Link to="/signup" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-7 text-sm font-bold text-black hover:bg-white/90">
            Sign Up Now <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}
