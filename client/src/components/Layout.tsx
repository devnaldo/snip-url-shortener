import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { useAuth } from '../auth/useAuth';
import { cn } from '../lib/styles';
import { useToast } from '../toast/useToast';

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
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3">
          <Link
            to="/"
            className="text-lg font-semibold tracking-tight text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            Snip
          </Link>

          <nav aria-label="Main" className="ml-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-2.5 py-1.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )
              }
            >
              Links
            </NavLink>
          </nav>

          <div className="ml-auto flex min-w-0 items-center gap-2">
            <span className="hidden max-w-[16rem] truncate text-xs text-slate-500 md:inline">
              {user?.email}
            </span>
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

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 py-4">
        <p className="mx-auto w-full max-w-7xl px-4 text-xs text-slate-500">
          Snip — short links with privacy-friendly analytics.
        </p>
      </footer>
    </div>
  );
}
