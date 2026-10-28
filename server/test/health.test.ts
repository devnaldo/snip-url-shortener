import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const app = createApp();

interface HealthBody {
  status: string;
  service: string;
  uptime: number;
  timestamp: string;
}

describe('GET /health', () => {
  it('reports that the service is up', async () => {
    const response = await request(app).get('/health');
    const body = response.body as HealthBody;

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(body).toMatchObject({ status: 'ok', service: 'snip-api' });
    expect(typeof body.uptime).toBe('number');
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });

  it('sets security headers and hides the framework fingerprint', async () => {
    const response = await request(app).get('/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('allows the configured client origin', async () => {
    const response = await request(app).get('/health').set('Origin', 'http://localhost:5173');

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('does not allow unknown origins', async () => {
    const response = await request(app).get('/health').set('Origin', 'http://evil.example');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
