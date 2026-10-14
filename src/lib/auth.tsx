import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type Role = 'user' | 'owner' | 'reviewer' | 'support';
export type User = { id: string; email: string; username: string; role: Role; emailVerified: boolean; createdAt: string; avatar: string | null };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// The host (Render free tier) sleeps after inactivity and takes ~50s to wake, during which the
// first requests can't connect. We retry GETs across that window so a cold start looks like a
// brief load, not an error. POSTs are never auto-retried (a lost response could double-submit);
// the caller surfaces the error and the user retries. A real server error (non-2xx) returns a
// response, so it is NOT a connection failure and surfaces immediately — cold-start retries never
// hide genuine bugs.
const WAKE_RETRY_DELAYS = [1000, 2000, 3000, 5000, 8000, 10000, 12000, 12000]; // ~63s total

// Talks to the Kredilo API (proxied from /api in development). Returns parsed JSON or throws a readable Error.
export async function apiRequest<T = unknown>(path: string, body?: unknown): Promise<T> {
  const isGet = body === undefined;
  const init: RequestInit = {
    method: isGet ? 'GET' : 'POST',
    headers: isGet ? undefined : { 'Content-Type': 'application/json' },
    body: isGet ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  };

  let res: Response | null = null;
  for (let attempt = 0; ; attempt++) {
    try {
      res = await fetch(path, init);
      break; // connected — a non-ok status is handled below, not retried here
    } catch {
      // Couldn't connect at all (likely the host waking up). Retry GETs; give up on POSTs.
      if (!isGet || attempt >= WAKE_RETRY_DELAYS.length) {
        throw new Error('Can’t reach the Kredilo server. It may be waking up — please try again in a moment.');
      }
      await sleep(WAKE_RETRY_DELAYS[attempt]);
    }
  }

  let data: { error?: string } | null = null;
  try {
    data = (await res.json()) as { error?: string };
  } catch {
    data = null;
  }
  if (!res.ok) throw new Error(data?.error ?? 'Something went wrong. Please try again.');
  return data as T;
}

type AuthValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, username: string, referralCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export const uploadAvatar = (image: string) => apiRequest('/api/avatar', { image });
export const removeAvatar = () => apiRequest('/api/avatar/remove', {});
export const changeUsername = (username: string) => apiRequest<{ user: User }>('/api/auth/username', { username });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await apiRequest<{ user: User | null }>('/api/auth/me');
      setUser(r.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      loading,
      refresh,
      login: async (email, password) => {
        const r = await apiRequest<{ user: User }>('/api/auth/login', { email, password });
        setUser(r.user);
      },
      signup: async (email, password, username, referralCode) => {
        const r = await apiRequest<{ user: User }>('/api/auth/signup', { email, password, username, referralCode });
        setUser(r.user);
      },
      logout: async () => {
        try {
          await apiRequest('/api/auth/logout', {});
        } finally {
          setUser(null);
        }
      },
    }),
    [user, loading, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
