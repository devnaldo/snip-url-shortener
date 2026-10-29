export interface NoticePageOptions {
  statusCode: 404 | 410;
  title: string;
  heading: string;
  message: string;
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escape a value for interpolation into HTML text or a quoted attribute. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character] ?? character);
}

const STYLES = `
:root {
  color-scheme: light dark;
  --bg: #faf9f6;
  --surface: #ffffff;
  --border: #e6e3dc;
  --ink: #1f201d;
  --muted: #5f625b;
  --subtle: #74776f;
  --accent: #4f6b52;
  --accent-ink: #ffffff;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #111210;
    --surface: #191a17;
    --border: #2e2f29;
    --ink: #f1f0e9;
    --muted: #a9aaa1;
    --subtle: #8b8d83;
    --accent: #a6c5a0;
    --accent-ink: #101210;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  background: var(--bg);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
}
main {
  width: 100%;
  max-width: 27rem;
  padding: 1.75rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  box-shadow: 0 1px 2px rgba(31, 32, 29, 0.05);
}
.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1.75rem;
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink);
}
.brand svg { display: block; flex: none; }
.status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.75rem;
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--subtle);
}
.status::before {
  content: "";
  width: 0.375rem;
  height: 0.375rem;
  background: var(--accent);
}
h1 {
  margin: 0 0 0.5rem;
  font-size: 1.125rem;
  line-height: 1.35;
  letter-spacing: 0.01em;
  color: var(--ink);
}
p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--muted);
}
.hint {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
  font-size: 0.75rem;
  line-height: 1.6;
  color: var(--subtle);
}
`.trim();

const BRAND_MARK = `<svg width="24" height="24" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
  <rect width="32" height="32" rx="2" fill="var(--accent)" />
  <g fill="var(--accent-ink)" shape-rendering="crispEdges">
    <rect x="10" y="2" width="12" height="4" />
    <rect x="6" y="6" width="4" height="4" />
    <rect x="22" y="6" width="4" height="4" />
    <rect x="6" y="10" width="4" height="4" />
    <rect x="10" y="14" width="12" height="4" />
    <rect x="22" y="18" width="4" height="4" />
    <rect x="6" y="22" width="4" height="4" />
    <rect x="22" y="22" width="4" height="4" />
    <rect x="10" y="26" width="12" height="4" />
  </g>
</svg>`;

/** Render a standalone, escaped HTML page for redirect failures. */
export function renderNoticePage(options: NoticePageOptions): string {
  const title = escapeHtml(options.title);
  const heading = escapeHtml(options.heading);
  const message = escapeHtml(options.message);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>${title} · Snip</title>
  <style>${STYLES}</style>
</head>
<body>
  <main>
    <p class="brand">${BRAND_MARK}<span>Snip</span></p>
    <p class="status" aria-hidden="true">${options.statusCode}</p>
    <h1>${heading}</h1>
    <p>${message}</p>
    <p class="hint">If you followed this link from somewhere, ask the person who shared it for an updated one.</p>
  </main>
</body>
</html>
`;
}
