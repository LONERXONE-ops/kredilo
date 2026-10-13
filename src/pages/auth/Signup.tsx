import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, AtSign, Gamepad2, Gift, Lock, Mail, Sparkles, WalletCards, Zap } from 'lucide-react';
import { AuthShell } from '../../components/AuthShell';
import { AuthField } from '../../components/AuthField';
import { useAuth } from '../../lib/auth';

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [referral, setReferral] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Prefill the referral code from an invite link (/signup?ref=ABC123).
  useEffect(() => {
    const ref = params.get('ref');
    if (ref) setReferral(ref.toUpperCase());
  }, [params]);

  return (
    <AuthShell
      badge="Create Account"
      title="Sign Up"
      subtitle="Join Kredilo and start completing tasks, playing games, and earning kreds."
      panel={{
        title: 'Start Your Kredilo Journey',
        text: 'Create your account in minutes and get access to tasks, games and rewards.',
        items: [
          { icon: Zap, title: 'Complete simple tasks', text: 'Follow clear instructions and get rewarded.' },
          { icon: Gamepad2, title: 'Play fun games', text: 'Enjoy browser games and daily challenges.' },
          { icon: Sparkles, title: 'Earn kreds', text: 'Collect kreds for approved activities.' },
          { icon: WalletCards, title: 'Track your wallet', text: 'Withdrawals open once secure payments are ready.' },
        ],
      }}
    >
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!/^[a-z0-9_]{3,20}$/.test(username.trim().toLowerCase())) return setError('Username must be 3-20 characters: lowercase letters, numbers or underscores.');
          if (password.length < 8) return setError('Password must be at least 8 characters long.');
          if (password !== confirm) return setError('Passwords do not match.');
          if (!agreed) return setError('Please confirm you’re 18 or older and agree to the Terms and Privacy Policy.');
          setBusy(true);
          setError('');
          try {
            await signup(email, password, username.trim().toLowerCase(), referral.trim().toUpperCase() || undefined);
            navigate('/welcome');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not create your account.');
          } finally {
            setBusy(false);
          }
        }}
      >
        <AuthField label="Email Address" icon={Mail} type="email" placeholder="Enter your email address" value={email} onChange={setEmail} autoComplete="email" />
        <AuthField label="Username" icon={AtSign} type="text" placeholder="Pick a username" value={username} onChange={setUsername} hint="This is your public name on Kredilo — not your email." autoComplete="username" />
        <AuthField label="Password" icon={Lock} type="password" placeholder="Create a password" value={password} onChange={setPassword} hint="Password must be at least 8 characters long." autoComplete="new-password" />
        <AuthField label="Confirm Password" icon={Lock} type="password" placeholder="Confirm your password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        <AuthField label="Referral code (optional)" icon={Gift} type="text" placeholder="Enter a friend's code" value={referral} onChange={(v) => setReferral(v.toUpperCase())} hint="Did someone invite you? Enter their code so they get rewarded." />
        <label className="flex items-start gap-2.5 text-xs leading-relaxed text-white/60">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500" />
          <span>I confirm I am 18 or older and I agree to Kredilo's <Link to="/terms" className="font-bold text-white underline underline-offset-2">Terms of Service</Link> and <Link to="/privacy" className="font-bold text-white underline underline-offset-2">Privacy Policy</Link>.</span>
        </label>
        {error && <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
        <button type="submit" disabled={busy || !agreed} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black hover:bg-white/90 disabled:opacity-60">
          {busy ? 'Creating account...' : 'Create Account'} <ArrowRight size={18} />
        </button>
        <p className="text-center text-sm text-white/60">Already have an account? <Link to="/login" className="font-bold text-white underline underline-offset-4">Log In</Link></p>
      </form>
    </AuthShell>
  );
}
