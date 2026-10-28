import { db } from '../db/client.js';
import { clicks } from '../db/schema.js';
import type { NewClick } from '../db/schema.js';

/** Insert a batch of click events in one statement. */
export async function insertClicks(events: NewClick[]): Promise<void> {
  if (events.length === 0) {
    return;
  }

  await db.insert(clicks).values(events);
}
