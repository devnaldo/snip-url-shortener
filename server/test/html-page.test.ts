import { describe, expect, it } from 'vitest';
import { escapeHtml, renderNoticePage } from '../src/lib/html-page.js';

describe('escapeHtml', () => {
  it('escapes every HTML metacharacter', () => {
    expect(escapeHtml(`<script>&"'</script>`)).toBe(
      '&lt;script&gt;&amp;&quot;&#39;&lt;/script&gt;',
    );
  });
});

describe('renderNoticePage', () => {
  it('escapes interpolated content and includes the status code', () => {
    const html = renderNoticePage({
      statusCode: 404,
      title: '<img src=x onerror=alert(1)>',
      heading: `Link "o'neil"`,
      message: '<script>alert(1)</script>',
    });

    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('Link &quot;o&#39;neil&quot;');
    expect(html).toContain('aria-hidden="true">404<');
  });
});
