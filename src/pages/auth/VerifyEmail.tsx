import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, Loader2, X } from 'lucide-react';
import { apiRequest, useAuth } from '../../lib/auth';

type State = 'working' | 'ok' | 'error';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const { refresh } = useAuth();
  const [state, setState] = useState<State>('working');
  const [message, setMessage] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = params.get('token') ?? '';
    apiRequest('/api/auth/verify', { token })
      .then(() => {
        setState('ok');
        return refresh();
      })
      .catch((err: unknown) => {
        setState('error');
        setMessage(err instanceof Error ? err.message : 'Could not verify your email.');
      });
  }, [params, refresh]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-5 py-24 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/60 bg-white/10">
        {state === 'working' && <Loader2 size={40} className="animate-spin" />}
        {state === 'ok' && <Check size={48} strokeWidth={3} />}
        {state === 'error' && <X size={48} strokeWidth={3} />}
      </div>
      <h1 className="mt-6 text-3xl font-extrabold">
        {state === 'working' ? 'Verifying your email...' : state === 'ok' ? 'Email verified' : 'Could not verify'}
      </h1>
      {state === 'ok' && <p className="mt-2 text-white/60">Thanks. Your email address is now confirmed.</p>}
      {state === 'error' && <p className="mt-2 text-white/60">{message} You can request a new link from your profile.</p>}
      {state !== 'working' && (
        <Link to="/dashboard" className="mt-8 inline-flex min-h-12 items-center rounded-full bg-white px-8 text-sm font-bold text-black hover:bg-white/90">
          Go to Dashboard
        </Link>
      )}
    </div>
  );
}
