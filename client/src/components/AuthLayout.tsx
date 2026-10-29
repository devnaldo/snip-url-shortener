import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center px-4 py-4">
          <Link
            to="/"
            className="text-lg font-semibold tracking-tight text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Snip
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-md">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              {title}
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </div>
          <div className="mt-5 text-center text-sm text-slate-600">{footer}</div>
        </div>
      </main>

      <footer className="border-t border-slate-200 py-4">
        <p className="mx-auto w-full max-w-6xl px-4 text-xs text-slate-500">
          Snip — short links with privacy-friendly analytics.
        </p>
      </footer>
    </div>
  );
}
