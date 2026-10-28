import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('error handling', () => {
  it('returns a consistent 404 body for unknown routes', async () => {
    // Single-segment paths are handled by the alias redirect route, so use a
    // nested path to exercise the JSON not-found handler.
    const response = await request(app).get('/nested/unknown/route');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'Resource not found' },
    });
    expect(response.body).not.toHaveProperty('stack');
  });

  it('rejects malformed JSON without leaking parser details', async () => {
    const response = await request(app)
      .post('/health')
      .set('Content-Type', 'application/json')
      .send('{"broken"');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' },
    });
  });
});
