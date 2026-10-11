import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Lock, ShieldCheck } from 'lucide-react';
import { AuthShell } from '../../components/AuthShell';
import { AuthField } from '../../components/AuthField';
import { apiRequest } from '../../lib/auth';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <AuthShell
      badge="Reset Password"
      title="Choose a New Password"
      subtitle="Enter a new password for your Kredilo account."
      panel={{
        title: 'Almost There.',
        text: 'Pick a strong password you do not use anywhere else.',
        items: [{ icon: ShieldCheck, title: 'Stay signed out elsewhere', text: 'Resetting signs you out of all other devices.' }],
      }}
    >
      {done ? (
        <div className="space-y-4">
          <p role="status" className="rounded-2xl border border-white/15 bg-white/[0.05] px-4 py-3 text-sm text-white/80">Your password was changed. You can log in now.</p>
          <Link to="/login" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black hover:bg-white/90">
            Go to Log In <ArrowRight size={18} />
          </Link>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (password !== confirm) return setError('Passwords do not match.');
            setBusy(true);
            setError('');
            try {
              await apiRequest('/api/auth/reset', { token, password });
              setDone(true);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Could not reset your password.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <AuthField label="New Password" icon={Lock} type="password" placeholder="Create a new password" value={password} onChange={setPassword} hint="At least 8 characters." autoComplete="new-password" />
          <AuthField label="Confirm Password" icon={Lock} type="password" placeholder="Confirm your new password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
          {error && <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
          <button type="submit" disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black hover:bg-white/90 disabled:opacity-60">
            {busy ? 'Saving...' : 'Change Password'} <ArrowRight size={18} />
          </button>
        </form>
      )}
    </AuthShell>
  );
}
