import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Mail } from 'lucide-react';
import { AuthShell } from '../../components/AuthShell';
import { AuthField } from '../../components/AuthField';
import { apiRequest } from '../../lib/auth';

const stepIcon = (n: string) => ({ icon: () => <span className="text-xl font-extrabold">{n}</span> });

export default function AccountRecovery() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <AuthShell
      badge="Account Recovery"
      title="Recover Your Account"
      subtitle="Enter your email address and we’ll help you get back into your Kredilo account."
      panel={{
        title: 'Get Back Into Your Account',
        text: 'If you’re unable to log in, follow these steps to recover your account.',
        items: [
          { ...stepIcon('1'), title: 'Enter your email address', text: 'Use the email linked to your Kredilo account.' },
          { ...stepIcon('2'), title: 'Check your inbox', text: 'We’ll send you a recovery link to reset your access.' },
          { ...stepIcon('3'), title: 'Follow the link', text: 'Click the link and follow the instructions to regain access.' },
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
          {busy ? 'Sending...' : 'Send Recovery Link'} <ArrowRight size={18} />
        </button>
        {sent && (
          <p role="status" className="rounded-2xl border border-white/15 bg-white/[0.05] px-4 py-3 text-sm text-white/80">
            If an account exists for that email, a recovery link has been sent.
          </p>
        )}
        <div className="flex items-center gap-3 text-xs text-white/40"><span className="h-px flex-1 bg-white/15" />or<span className="h-px flex-1 bg-white/15" /></div>
        <Link to="/login" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-white/20 text-sm font-semibold hover:bg-white/5">
          <ArrowLeft size={18} /> Back to Log In
        </Link>
      </form>
    </AuthShell>
  );
}
