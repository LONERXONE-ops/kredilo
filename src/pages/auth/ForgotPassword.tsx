import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Link2, Mail, ShieldCheck } from 'lucide-react';
import { AuthShell } from '../../components/AuthShell';
import { AuthField } from '../../components/AuthField';
import { apiRequest } from '../../lib/auth';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <AuthShell
      badge="Forgot Password"
      title="Reset Your Password"
      subtitle="Enter your email address and we’ll send you a link to reset your password."
      panel={{
        title: 'Don’t Worry, We’ve Got You.',
        text: 'Resetting your password is quick and easy.',
        items: [
          { icon: Mail, title: 'Check your email', text: 'Look for the reset link in your inbox.' },
          { icon: Link2, title: 'Click the link', text: 'Follow the instructions in the email.' },
          { icon: ShieldCheck, title: 'Set a new password', text: 'Choose a strong password to keep your account secure.' },
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
            await apiRequest('/api/auth/forgot', { email });
            setSent(true);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong.');
          } finally {
            setBusy(false);
          }
        }}
      >
        <AuthField label="Email Address" icon={Mail} type="email" placeholder="Enter your email address" value={email} onChange={setEmail} autoComplete="email" />
        {error && <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
        <button type="submit" disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black hover:bg-white/90 disabled:opacity-60">
          {busy ? 'Sending...' : 'Send Reset Link'} <ArrowRight size={18} />
        </button>
        {sent && (
          <p role="status" className="rounded-2xl border border-white/15 bg-white/[0.05] px-4 py-3 text-sm text-white/80">
            If an account exists for that email, a reset link has been sent.
          </p>
        )}
        <p className="pt-2 text-center text-sm text-white/60">Remember your password? <Link to="/login" className="font-bold text-white underline underline-offset-4">Log In</Link></p>
      </form>
    </AuthShell>
  );
}
