import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Button } from '../components/Button';
import { FullPageLoader } from '../components/Spinner';
import { useAuth } from './useAuth';

function SessionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-rose-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-base font-semibold text-slate-900">Could not load your session</h1>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <Button className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  );
}

function SessionGate() {
  const { status, error, retry } = useAuth();

  if (status === 'loading') {
    return <FullPageLoader label="Checking your session…" />;
  }

  if (status === 'error') {
    return (
      <SessionError
        message={error ?? 'The server is unavailable. Please try again.'}
        onRetry={retry}
      />
    );
  }

  return null;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status !== 'authenticated' && status !== 'unauthenticated') {
    return <SessionGate />;
  }

  if (status === 'unauthenticated') {
    return (
      <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
    );
  }

  return <>{children}</>;
}

export function GuestRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  if (status !== 'authenticated' && status !== 'unauthenticated') {
    return <SessionGate />;
  }

  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
