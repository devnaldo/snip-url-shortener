/* global window, document */

// Resolve the theme before first paint so the UI never flashes the wrong mode.
// Loaded as a blocking script from <head>; the production CSP allows it via
// script-src 'self' without needing 'unsafe-inline'.
(function () {
  try {
    var stored = window.localStorage.getItem('snip-theme');
    var mode = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    var isDark =
      mode === 'dark' ||
      (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var root = document.documentElement;

    root.classList.toggle('dark', isDark);
    root.style.colorScheme = isDark ? 'dark' : 'light';
    root.dataset.themeMode = mode;

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', isDark ? '#111210' : '#FAF9F6');
    }
  } catch {
    // A blocked localStorage must never break rendering.
  }
})();
