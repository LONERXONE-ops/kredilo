import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Link2, Mail, ShieldCheck } from 'lucide-react';
import { AuthShell } from '../../components/AuthShell';
import { AuthField } from '../../components/AuthField';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

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
        onSubmit={(e) => {
          e.preventDefault();
          setSent(true);
        }}
      >
        <AuthField label="Email Address" icon={Mail} type="email" placeholder="Enter your email address" value={email} onChange={setEmail} autoComplete="email" />
        <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black hover:bg-white/90">
          Send Reset Link <ArrowRight size={18} />
        </button>
        {sent && (
          <p role="status" className="rounded-2xl border border-white/15 bg-white/[0.05] px-4 py-3 text-sm text-white/80">
            Demo mode: no email was sent. Password reset will work once the backend and email delivery are connected.
          </p>
        )}
        <p className="pt-2 text-center text-sm text-white/60">Remember your password? <Link to="/login" className="font-bold text-white underline underline-offset-4">Log In</Link></p>
      </form>
    </AuthShell>
  );
}
