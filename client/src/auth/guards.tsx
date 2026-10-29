import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Button } from '../components/Button';
import { AlertIcon } from '../components/Icons';
import { LogoMark } from '../components/Logo';
import { FullPageLoader } from '../components/Spinner';
import { useAuth } from './useAuth';

function SessionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-6 text-center shadow-panel">
        <LogoMark className="mx-auto h-8 w-8" />
        <h1 className="mt-4 font-display text-[0.8125rem] uppercase tracking-[0.06em] text-ink">
          Session unavailable
        </h1>
        <p className="mt-2 flex items-start justify-center gap-2 text-left text-xs leading-relaxed text-muted">
          <AlertIcon className="mt-px h-3.5 w-3.5 shrink-0 text-danger" />
          <span>{message}</span>
        </p>
        <Button className="mt-5 w-full" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  );
}

function SessionGate() {
  const { status, error, retry } = useAuth();

  if (status === 'loading') {
    return <FullPageLoader label="Checking your session" />;
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
