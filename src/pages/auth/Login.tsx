import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Coins, Gamepad2, Lock, Mail, WalletCards, Zap } from 'lucide-react';
import { AuthShell } from '../../components/AuthShell';
import { AuthField } from '../../components/AuthField';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <AuthShell
      badge="Welcome Back"
      title="Log In to Kredilo"
      subtitle="Access your account, complete tasks, play games, and track your rewards."
      panel={{
        title: 'Your Tasks. Your Rewards.',
        text: 'Log in to continue your journey on Kredilo.',
        items: [
          { icon: Zap, title: 'Complete simple tasks', text: 'Follow clear instructions and get rewarded.' },
          { icon: Gamepad2, title: 'Play fun games', text: 'Enjoy browser games and daily challenges.' },
          { icon: Coins, title: 'Earn tokens', text: 'Collect tokens for approved activities.' },
          { icon: WalletCards, title: 'Track your wallet', text: 'Withdrawals open once secure payments are ready.' },
        ],
      }}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          navigate('/dashboard');
        }}
      >
        <AuthField label="Email Address" icon={Mail} type="email" placeholder="Enter your email address" value={email} onChange={setEmail} autoComplete="email" />
        <AuthField label="Password" icon={Lock} type="password" placeholder="Enter your password" value={password} onChange={setPassword} autoComplete="current-password" />
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" defaultChecked className="h-4 w-4 accent-white" /> Remember me</label>
          <Link to="/forgot-password" className="font-semibold underline underline-offset-4">Forgot password?</Link>
        </div>
        <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black hover:bg-white/90">
          Log In <ArrowRight size={18} />
        </button>
        <p className="text-center text-xs text-white/40">Demo mode: sign-in is simulated. No real account is checked yet.</p>
        <div className="flex items-center gap-3 text-xs text-white/40"><span className="h-px flex-1 bg-white/15" />or<span className="h-px flex-1 bg-white/15" /></div>
        <button type="button" disabled className="min-h-12 w-full cursor-not-allowed rounded-full border border-white/15 text-sm font-semibold text-white/40">
          Continue with Google (coming soon)
        </button>
        <p className="text-center text-sm text-white/60">Don’t have an account? <Link to="/signup" className="font-bold text-white underline underline-offset-4">Sign Up</Link></p>
      </form>
    </AuthShell>
  );
}
