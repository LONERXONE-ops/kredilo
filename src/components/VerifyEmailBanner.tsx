import { useState } from 'react';
import { MailWarning } from 'lucide-react';
import { apiRequest, useAuth } from '../lib/auth';

// Persistent call-to-action shown to any signed-in user whose email isn't verified yet —
// including existing users. Disappears automatically once their email is verified.
export function VerifyEmailBanner() {
  const { user } = useAuth();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!user || user.emailVerified) return null;

  const resend = async () => {
    setBusy(true);
    try {
      await apiRequest('/api/auth/resend-verification', {});
      setSent(true);
    } catch {
      /* ignore — keep the banner up so they can try again */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-4 pt-3 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-2.5 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <MailWarning size={20} className="mt-0.5 shrink-0 text-amber-300" />
          <p className="text-sm leading-relaxed text-amber-100/90">
            <span className="font-bold text-amber-200">Verify your email</span> to secure your account and unlock withdrawals. Check your inbox (and spam) for the link.
          </p>
        </div>
        <button
          onClick={resend}
          disabled={busy || sent}
          className="shrink-0 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-amber-300 disabled:opacity-70"
        >
          {sent ? 'Email sent ✓' : busy ? 'Sending…' : 'Resend email'}
        </button>
      </div>
    </div>
  );
}
