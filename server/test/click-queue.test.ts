import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClickQueue } from '../src/lib/click-queue.js';
import type { NewClick } from '../src/db/schema.js';

function makeEvent(overrides: Partial<NewClick> = {}): NewClick {
  return {
    linkId: '22222222-2222-4222-8222-222222222222',
    clickedAt: new Date('2026-01-01T00:00:00Z'),
    referrerHost: null,
    referrerUrl: null,
    deviceType: 'desktop',
    browser: 'Chrome',
    os: 'Windows',
    visitorHash: 'a'.repeat(64),
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('ClickQueue', () => {
  it('batches inserts when the batch size is reached', async () => {
    const insert = vi.fn<(events: NewClick[]) => Promise<void>>().mockResolvedValue(undefined);
    const queue = new ClickQueue({ insert, maxBatchSize: 2 });

    queue.enqueue(makeEvent());
    queue.enqueue(makeEvent());
    await queue.flush();

    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0]?.[0]).toHaveLength(2);
    expect(queue.size).toBe(0);
  });

  it('flushes buffered events on the interval', async () => {
    vi.useFakeTimers();
    const insert = vi.fn<(events: NewClick[]) => Promise<void>>().mockResolvedValue(undefined);
    const queue = new ClickQueue({ insert, flushIntervalMs: 1_000 });

    queue.start();
    queue.enqueue(makeEvent());
    expect(insert).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1_000);
    await queue.flush();

    expect(insert).toHaveBeenCalledTimes(1);
    await queue.stop();
  });

  it('flushes everything on stop', async () => {
    const insert = vi.fn<(events: NewClick[]) => Promise<void>>().mockResolvedValue(undefined);
    const queue = new ClickQueue({ insert, maxBatchSize: 100, flushIntervalMs: 60_000 });

    queue.start();
    queue.enqueue(makeEvent({ browser: 'Firefox' }));
    queue.enqueue(makeEvent({ browser: 'Safari' }));

    await queue.stop();

    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0]?.[0]).toHaveLength(2);
    expect(queue.size).toBe(0);
  });

  it('drops events once the bounded queue is full', async () => {
    const insert = vi.fn<(events: NewClick[]) => Promise<void>>().mockResolvedValue(undefined);
    const queue = new ClickQueue({ insert, maxQueueSize: 2, flushIntervalMs: 60_000 });

    queue.enqueue(makeEvent());
    queue.enqueue(makeEvent());
    queue.enqueue(makeEvent());

    expect(queue.size).toBe(2);
    expect(queue.dropped).toBe(1);

    await queue.flush();
    expect(insert.mock.calls[0]?.[0]).toHaveLength(2);
  });

  it('logs and swallows insert failures, then keeps accepting events', async () => {
    const error = new Error('database is down');
    const insert = vi
      .fn<(events: NewClick[]) => Promise<void>>()
      .mockRejectedValueOnce(error)
      .mockResolvedValue(undefined);
    const queue = new ClickQueue({ insert });

    queue.enqueue(makeEvent());
    await expect(queue.flush()).resolves.toBeUndefined();
    expect(queue.failed).toBe(1);
    expect(queue.dropped).toBe(0);

    queue.enqueue(makeEvent({ browser: 'Firefox' }));
    await queue.flush();

    expect(insert).toHaveBeenCalledTimes(2);
    expect(queue.size).toBe(0);
  });

  it('ignores events after stop', async () => {
    const insert = vi.fn<(events: NewClick[]) => Promise<void>>().mockResolvedValue(undefined);
    const queue = new ClickQueue({ insert });

    await queue.stop();
    queue.enqueue(makeEvent());
    await queue.flush();

    expect(insert).not.toHaveBeenCalled();
    expect(queue.dropped).toBe(1);
  });
});
