import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

export default function RegistrationSuccess() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-16 grid lg:grid-cols-2 gap-8">
      <div className="border border-white/10 rounded-3xl p-10 bg-[#111] text-center">
        <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} />
        </div>
        <h1 className="text-3xl font-bold mb-2">Welcome to Kredilo!</h1>
        <p className="text-lg font-medium mb-4">Your account has been created successfully.</p>
        <p className="text-white/60 text-sm mb-8">You’re now all set to start completing tasks, playing games, and earning tokens on Kredilo.</p>
        <Link to="/dashboard" className="inline-block bg-white text-black px-8 py-3 rounded-full font-semibold">
          Continue to Dashboard →
        </Link>
        <p className="mt-4 text-xs text-white/40">You can always access your account from the top right menu.</p>
      </div>
      <div className="border border-white/10 rounded-3xl p-8 bg-[#111]">
        <h2 className="text-2xl font-bold mb-6">What’s Next?</h2>
        <p className="text-sm text-white/60 mb-6">Now that your account is ready, here’s what you can do:</p>
        <ul className="space-y-4">
          <li className="flex gap-3"><span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">✓</span> <div><div className="font-medium">Complete Tasks</div><div className="text-sm text-white/50">Follow the instructions and earn tokens.</div></div></li>
          <li className="flex gap-3"><span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">🎮</span> <div><div className="font-medium">Play Games</div><div className="text-sm text-white/50">Enjoy fun browser games and daily challenges.</div></div></li>
          <li className="flex gap-3"><span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">🪙</span> <div><div className="font-medium">Track Your Earnings</div><div className="text-sm text-white/50">View your token balance and transaction history.</div></div></li>
          <li className="flex gap-3"><span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">→</span> <div><div className="font-medium">Request Withdrawals</div><div className="text-sm text-white/50">Meet the requirements and cash out your tokens.</div></div></li>
        </ul>
      </div>
    </div>
  );
}
