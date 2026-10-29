import type { ReactNode } from 'react';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

const HIGHLIGHTS: ReadonlyArray<{ term: string; description: string }> = [
  { term: 'Create', description: 'Custom or generated aliases, optional expiry.' },
  { term: 'Redirect', description: 'Served from cache, 302 so every click is counted.' },
  { term: 'Measure', description: 'Clicks, unique visitors, referrers, devices, browsers.' },
];

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 items-center px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-center lg:gap-16 xl:gap-24">
          <aside className="hidden lg:block">
            <p className="eyebrow">Short links · measured</p>
            <h2 className="mt-5 font-display text-[2.25rem] leading-[1.15] tracking-tight text-ink">
              Every click,
              <br />
              on the record.
            </h2>
            <p className="mt-5 max-w-sm text-[0.8125rem] leading-relaxed text-muted">
              Snip shortens a URL, resolves the redirect from an in-memory cache, and records the
              click after the response has already left the server.
            </p>

            <ol className="mt-10 max-w-sm border-t border-line">
              {HIGHLIGHTS.map((highlight, index) => (
                <li key={highlight.term} className="flex gap-4 border-b border-line py-3.5">
                  <span
                    aria-hidden="true"
                    className="w-6 shrink-0 pt-0.5 font-terminal text-lg leading-none text-accent"
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-ink">
                      {highlight.term}
                    </p>
                    <p className="mt-1 text-[0.75rem] leading-relaxed text-muted">
                      {highlight.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </aside>

          <div className="w-full max-w-md justify-self-center lg:max-w-none lg:justify-self-end">
            <div className="rounded-xl border border-line bg-surface p-6 shadow-panel sm:p-8">
              <p className="eyebrow">Account</p>
              <h1 className="mt-3 font-display text-[1.375rem] leading-tight tracking-tight text-ink sm:text-[1.5rem]">
                {title}
              </h1>
              <p className="mt-2 text-xs leading-relaxed text-muted">{subtitle}</p>
              <div className="mt-7">{children}</div>
            </div>
            <div className="mt-5 text-center text-xs text-muted">{footer}</div>
          </div>
        </div>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1.5 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
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
