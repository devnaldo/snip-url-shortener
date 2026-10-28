import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // Deterministic, test-only configuration. Never used outside the test run.
    env: {
      NODE_ENV: 'test',
      PORT: '3001',
      DATABASE_URL: 'postgresql://snip:snip@localhost:5432/snip_test',
      JWT_SECRET: 'test-jwt-secret-that-is-at-least-32-characters-long',
      CLIENT_URL: 'http://localhost:5173',
      BASE_URL: 'http://localhost:3000',
      CLICK_HASH_SECRET: 'test-click-hash-secret-at-least-32-characters',
      LINK_RATE_LIMIT_MAX: '20',
      LINK_RATE_LIMIT_WINDOW_MS: '3600000',
    },
  },
});
