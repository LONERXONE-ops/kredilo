import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Coins, Gamepad2, Lock, Mail, WalletCards, Zap } from 'lucide-react';
import { AuthShell } from '../../components/AuthShell';
import { AuthField } from '../../components/AuthField';
import { GoogleButton } from '../../components/GoogleButton';
import { useAuth } from '../../lib/auth';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

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
          { icon: Coins, title: 'Earn kreds', text: 'Collect kreds for approved activities.' },
          { icon: WalletCards, title: 'Track your wallet', text: 'Withdrawals open once secure payments are ready.' },
        ],
      }}
    >
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            await login(email, password);
            navigate(from, { replace: true });
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not log in.');
          } finally {
            setBusy(false);
          }
        }}
      >
        <AuthField label="Email Address" icon={Mail} type="email" placeholder="Enter your email address" value={email} onChange={setEmail} autoComplete="email" />
        <AuthField label="Password" icon={Lock} type="password" placeholder="Enter your password" value={password} onChange={setPassword} autoComplete="current-password" />
        <div className="flex justify-end text-sm">
          <Link to="/forgot-password" className="font-semibold underline underline-offset-4">Forgot password?</Link>
        </div>
        {error && <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
        <button type="submit" disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black hover:bg-white/90 disabled:opacity-60">
          {busy ? 'Logging in...' : 'Log In'} <ArrowRight size={18} />
        </button>
        <GoogleButton label="Log in with Google" />
        <p className="text-center text-sm text-white/60">Don’t have an account? <Link to="/signup" className="font-bold text-white underline underline-offset-4">Sign Up</Link></p>
      </form>
    </AuthShell>
  );
}
