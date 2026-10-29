import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../api/auth';
import type { AuthInput } from '../api/auth';
import { ApiError, errorMessage, UNAUTHORIZED_EVENT } from '../api/client';
import type { User } from '../api/types';
import { AuthContext } from './auth-context';
import type { AuthStatus } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    authApi
      .me()
      .then((currentUser) => {
        if (cancelled) return;
        setUser(currentUser);
        setStatus('authenticated');
      })
      .catch((requestError: unknown) => {
        if (cancelled) return;

        if (requestError instanceof ApiError && requestError.status === 401) {
          setUser(null);
          setStatus('unauthenticated');
          return;
        }

        setError(errorMessage(requestError));
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setStatus('unauthenticated');
    };

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);

    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, []);

  const login = useCallback(async (input: AuthInput) => {
    const currentUser = await authApi.login(input);
    setUser(currentUser);
    setStatus('authenticated');
  }, []);

  const register = useCallback(async (input: AuthInput) => {
    const currentUser = await authApi.register(input);
    setUser(currentUser);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Clear the local session even if the network request fails.
    }

    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const retry = useCallback(() => {
    setStatus('loading');
    setError(null);
    setReloadToken((token) => token + 1);
  }, []);

  const value = useMemo(
    () => ({ status, user, error, login, register, logout, retry }),
    [status, user, error, login, register, logout, retry],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
