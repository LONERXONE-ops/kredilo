import { Link } from 'react-router-dom';
import { UserPlus, Search, CheckSquare, Shield, Coins, Wallet } from 'lucide-react';

const steps = [
  { n: 1, icon: UserPlus, title: 'Create an account.', desc: 'Sign up with your email and create your Kredilo account in minutes.' },
  { n: 2, icon: Search, title: 'Find an eligible task or game challenge.', desc: 'Browse available tasks and games from different categories.' },
  { n: 3, icon: CheckSquare, title: 'Complete the stated requirements.', desc: 'Follow the instructions and meet the eligibility conditions.' },
  { n: 4, icon: Shield, title: 'Wait for verification when required.', desc: "Some tasks need manual review. We'll let you know once it's verified." },
  { n: 5, icon: Coins, title: 'Receive eligible tokens.', desc: 'Approved tasks and games will credit your tokens to your wallet.' },
  { n: 6, icon: Wallet, title: 'Request a withdrawal after meeting the requirements.', desc: 'When you have enough tokens, request a payout through your preferred method.' },
];

export default function HowItWorks() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <div className="inline-block px-4 py-1 rounded-full bg-white/10 text-sm mb-6">How It Works</div>
        <h1 className="text-4xl sm:text-5xl font-bold">Simple Steps to Earn with Kredilo.</h1>
        <p className="mt-4 text-white/60 max-w-2xl mx-auto">
          Getting started is easy. Follow these steps and start earning tokens by completing tasks and playing games.
        </p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {steps.map((s) => (
          <div key={s.n} className="p-6 border border-white/10 rounded-2xl bg-[#111] hover:border-white/20 transition">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm">{s.n}</div>
              <s.icon size={22} className="text-white/70" />
            </div>
            <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
            <p className="text-sm text-white/60">{s.desc}</p>
          </div>
        ))}
      </div>
      <div className="mt-16 p-6 border border-white/10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#111]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl">🚀</div>
          <div>
            <div className="font-semibold">Ready to get started?</div>
            <div className="text-sm text-white/60">Create your account now and begin earning tokens.</div>
          </div>
        </div>
        <Link to="/signup" className="bg-white text-black px-6 py-3 rounded-full font-semibold whitespace-nowrap">
          Sign Up Now →
        </Link>
      </div>
    </div>
  );
}
