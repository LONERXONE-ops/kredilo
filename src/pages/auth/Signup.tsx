import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Coins, Gamepad2, Lock, Mail, WalletCards, Zap } from 'lucide-react';
import { AuthShell } from '../../components/AuthShell';
import { AuthField } from '../../components/AuthField';
import { useAuth } from '../../lib/auth';

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <AuthShell
      badge="Create Account"
      title="Sign Up"
      subtitle="Join Kredilo and start completing tasks, playing games, and earning tokens."
      panel={{
        title: 'Start Your Kredilo Journey',
        text: 'Create your account in minutes and get access to tasks, games and rewards.',
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
        onSubmit={async (e) => {
          e.preventDefault();
          if (password.length < 8) return setError('Password must be at least 8 characters long.');
          if (password !== confirm) return setError('Passwords do not match.');
          setBusy(true);
          setError('');
          try {
            await signup(email, password);
            navigate('/welcome');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not create your account.');
          } finally {
            setBusy(false);
          }
        }}
      >
        <AuthField label="Email Address" icon={Mail} type="email" placeholder="Enter your email address" value={email} onChange={setEmail} autoComplete="email" />
        <AuthField label="Password" icon={Lock} type="password" placeholder="Create a password" value={password} onChange={setPassword} hint="Password must be at least 8 characters long." autoComplete="new-password" />
        <AuthField label="Confirm Password" icon={Lock} type="password" placeholder="Confirm your password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        {error && <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
        <button type="submit" disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black hover:bg-white/90 disabled:opacity-60">
          {busy ? 'Creating account...' : 'Create Account'} <ArrowRight size={18} />
        </button>
        <div className="flex items-center gap-3 text-xs text-white/40"><span className="h-px flex-1 bg-white/15" />or<span className="h-px flex-1 bg-white/15" /></div>
        <button type="button" disabled className="min-h-12 w-full cursor-not-allowed rounded-full border border-white/15 text-sm font-semibold text-white/40">
          Continue with Google (coming soon)
        </button>
        <p className="text-center text-sm text-white/60">Already have an account? <Link to="/login" className="font-bold text-white underline underline-offset-4">Log In</Link></p>
      </form>
    </AuthShell>
  );
}
