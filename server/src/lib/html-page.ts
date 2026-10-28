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
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  background: #f4f4f5;
  color: #18181b;
}
main {
  width: 100%;
  max-width: 26rem;
  padding: 2rem 1.5rem;
  border: 1px solid #e4e4e7;
  border-radius: 0.75rem;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  text-align: center;
}
.brand {
  margin: 0 0 1.25rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #71717a;
}
.status {
  margin: 0;
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1;
  color: #a1a1aa;
}
h1 {
  margin: 0.75rem 0 0.5rem;
  font-size: 1.25rem;
  line-height: 1.3;
}
p {
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.5;
  color: #52525b;
}
.hint {
  margin-top: 1.5rem;
  font-size: 0.8125rem;
  color: #a1a1aa;
}
@media (prefers-color-scheme: dark) {
  body { background: #18181b; color: #fafafa; }
  main { background: #27272a; border-color: #3f3f46; }
  p { color: #a1a1aa; }
}
`.trim();

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
    <p class="brand">Snip</p>
    <p class="status" aria-hidden="true">${options.statusCode}</p>
    <h1>${heading}</h1>
    <p>${message}</p>
    <p class="hint">If you followed this link from somewhere, ask the person who shared it for an updated one.</p>
  </main>
</body>
</html>
`;
}
