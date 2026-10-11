import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { Check, Loader2, X } from 'lucide-react';
import { apiRequest, useAuth } from '../../lib/auth';

type State = 'working' | 'ok' | 'error';

export default function AcceptInvite() {
  const [params] = useSearchParams();
  const location = useLocation();
  const { user, loading, refresh } = useAuth();
  const [state, setState] = useState<State>('working');
  const [message, setMessage] = useState('');
  const started = useRef(false);
  const token = params.get('token') ?? '';

  useEffect(() => {
    if (loading || !user || started.current) return;
    started.current = true;
    apiRequest('/api/admin/invites/accept', { token })
      .then(() => {
        setState('ok');
        return refresh();
      })
      .catch((err: unknown) => {
        setState('error');
        setMessage(err instanceof Error ? err.message : 'Could not accept the invitation.');
      });
  }, [loading, user, token, refresh]);

  if (loading) return <div className="px-5 py-24 text-center text-sm text-white/50">Loading...</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-5 py-24 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/60 bg-white/10">
        {state === 'working' && <Loader2 size={40} className="animate-spin" />}
        {state === 'ok' && <Check size={48} strokeWidth={3} />}
        {state === 'error' && <X size={48} strokeWidth={3} />}
      </div>
      <h1 className="mt-6 text-3xl font-extrabold">
        {state === 'working' ? 'Checking your invitation...' : state === 'ok' ? 'You’re on the team' : 'Could not accept'}
      </h1>
      {state === 'ok' && <p className="mt-2 text-white/60">Your admin access is active.</p>}
      {state === 'error' && <p className="mt-2 text-white/60">{message}</p>}
      {state !== 'working' && (
        <Link to={state === 'ok' ? '/admin' : '/dashboard'} className="mt-8 inline-flex min-h-12 items-center rounded-full bg-white px-8 text-sm font-bold text-black hover:bg-white/90">
          {state === 'ok' ? 'Open Admin' : 'Go to Dashboard'}
        </Link>
      )}
    </div>
  );
}
