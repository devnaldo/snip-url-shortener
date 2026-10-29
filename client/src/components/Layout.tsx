import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { cn } from '../lib/styles';
import { useToast } from '../toast/useToast';
import { Button } from './Button';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

export function Layout() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logout();
      showToast('Signed out.', 'info');
      void navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:border focus:border-line focus:bg-surface focus:px-3 focus:py-2 focus:text-xs focus:text-ink focus:shadow-overlay"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 sm:gap-5 sm:px-6">
          <Logo />

          <span aria-hidden="true" className="hidden h-5 w-px bg-line sm:block" />

          <nav aria-label="Main" className="flex items-center">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cn(
                  'relative flex h-14 items-center font-mono text-[0.6875rem] font-medium uppercase tracking-[0.12em] transition-colors duration-150',
                  isActive ? 'text-ink' : 'text-muted hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span>Links</span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute inset-x-0 -bottom-px h-px bg-accent transition-opacity duration-150',
                      isActive ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </>
              )}
            </NavLink>
          </nav>

          <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
            <span className="hidden max-w-[13rem] truncate font-mono text-[0.6875rem] tracking-[0.02em] text-subtle lg:block">
              {user?.email}
            </span>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleLogout()}
              isLoading={isLoggingOut}
            >
              Log out
            </Button>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10"
      >
        <Outlet />
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-1.5 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-subtle">
            Snip — short links, measured
          </p>
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-subtle">
            Clicks recorded after redirect
          </p>
        </div>
      </footer>
    </div>
  );
}
