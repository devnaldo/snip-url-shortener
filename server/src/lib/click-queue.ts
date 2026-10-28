import type { NewClick } from '../db/schema.js';
import { logger } from './logger.js';

export const CLICK_QUEUE_FLUSH_INTERVAL_MS = 1_000;
export const CLICK_QUEUE_MAX_BATCH_SIZE = 100;
export const CLICK_QUEUE_MAX_SIZE = 10_000;

export type ClickBatchInserter = (events: NewClick[]) => Promise<void>;

export interface ClickQueueOptions {
  insert: ClickBatchInserter;
  flushIntervalMs?: number;
  maxBatchSize?: number;
  maxQueueSize?: number;
}

/**
 * Buffer for click events. Enqueueing is synchronous and allocation-only, so
 * the redirect path never waits for PostgreSQL. A background timer drains the
 * buffer in batches; insert failures are logged and discarded so a broken
 * database cannot grow the queue without bound or affect redirects.
 */
export class ClickQueue {
  private readonly insert: ClickBatchInserter;
  private readonly flushIntervalMs: number;
  private readonly maxBatchSize: number;
  private readonly maxQueueSize: number;

  private buffer: NewClick[] = [];
  private timer: NodeJS.Timeout | null = null;
  private draining: Promise<void> | null = null;
  private stopped = false;
  private droppedCount = 0;
  private failedCount = 0;

  constructor(options: ClickQueueOptions) {
    this.insert = options.insert;
    this.flushIntervalMs = options.flushIntervalMs ?? CLICK_QUEUE_FLUSH_INTERVAL_MS;
    this.maxBatchSize = options.maxBatchSize ?? CLICK_QUEUE_MAX_BATCH_SIZE;
    this.maxQueueSize = options.maxQueueSize ?? CLICK_QUEUE_MAX_SIZE;
  }

  /** Number of events waiting to be written. */
  get size(): number {
    return this.buffer.length;
  }

  /** Number of events dropped because the queue was full or stopped. */
  get dropped(): number {
    return this.droppedCount;
  }

  /** Number of events discarded after a failed insert. */
  get failed(): number {
    return this.failedCount;
  }

  /** Start the periodic flush timer. The timer is unref'd so it never holds the process open. */
  start(): void {
    if (this.timer !== null || this.stopped) {
      return;
    }

    this.timer = setInterval(() => {
      void this.flush();
    }, this.flushIntervalMs);
    this.timer.unref();
  }

  enqueue(event: NewClick): void {
    if (this.stopped || this.buffer.length >= this.maxQueueSize) {
      this.droppedCount += 1;

      if (this.droppedCount === 1 || this.droppedCount % 1_000 === 0) {
        logger.warn(
          { dropped: this.droppedCount, pending: this.buffer.length },
          'Click queue is full; dropping click events',
        );
      }

      return;
    }

    this.buffer.push(event);

    if (this.buffer.length >= this.maxBatchSize) {
      void this.flush();
    }
  }

  /** Drain the buffer. Concurrent callers share the same in-flight drain. */
  flush(): Promise<void> {
    if (this.draining !== null) {
      return this.draining;
    }

    this.draining = this.drain().finally(() => {
      this.draining = null;
    });

    return this.draining;
  }

  /** Stop accepting events and flush whatever is buffered. */
  async stop(): Promise<void> {
    this.stopped = true;

    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }

    await this.flush();

    // A drain that was already in flight may have finished just before stop()
    // and left newly enqueued events behind.
    if (this.buffer.length > 0) {
      await this.flush();
    }
  }

  private async drain(): Promise<void> {
    while (this.buffer.length > 0) {
      const batch = this.buffer.splice(0, this.maxBatchSize);

      try {
        await this.insert(batch);
      } catch (error) {
        this.failedCount += batch.length;
        logger.error(
          { err: error, count: batch.length, failed: this.failedCount },
          'Click batch insert failed; discarding batch',
        );
      }
    }
  }
}
