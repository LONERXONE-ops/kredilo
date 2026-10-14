import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/auth';

// "Continue with Google" — only renders once Google sign-in is configured on the server
// (GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET set). Clicking does a full-page redirect into the
// OAuth flow at /api/auth/google (not a fetch — OAuth needs a top-level navigation).
export function GoogleButton({ label = 'Continue with Google' }: { label?: string }) {
  const [enabled, setEnabled] = useState(false);
  const failed = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('error') === 'google';

  useEffect(() => {
    apiRequest<{ enabled: boolean }>('/api/auth/google/enabled')
      .then((r) => setEnabled(!!r.enabled))
      .catch(() => setEnabled(false));
  }, []);

  if (!enabled) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-white/35">
        <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
      </div>
      {failed && <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">Google sign-in didn’t complete. Please try again.</p>}
      <a
        href="/api/auth/google"
        className="pressable flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-white/20 bg-white/[0.03] text-sm font-bold transition hover:bg-white/[0.07]"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        {label}
      </a>
    </div>
  );
}
