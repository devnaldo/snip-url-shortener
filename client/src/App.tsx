function App() {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4">
          <span className="text-lg font-semibold tracking-tight">Snip</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            Scaffold
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-4 py-12">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Short links, measurable clicks.
          </h1>
          <p className="text-base text-slate-600 sm:text-lg">
            Snip turns long URLs into compact, shareable links and shows you what happens after
            people click them.
          </p>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Project status
          </h2>
          <p className="mt-2 text-sm text-slate-700">
            The API, database schema, and build tooling are in place. Authentication, link
            management, redirects, and analytics dashboards are next.
          </p>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-4">
        <p className="mx-auto w-full max-w-3xl px-4 text-xs text-slate-500">
          Snip — built with React, Vite, and Tailwind CSS.
        </p>
      </footer>
    </div>
  );
}

export default App;
