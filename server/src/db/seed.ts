import { createHash } from 'node:crypto';
import bcrypt from 'bcrypt';
import { inArray } from 'drizzle-orm';
import { buildShortUrl } from '../lib/short-url.js';
import { logger } from '../lib/logger.js';
import { closeDb, db } from './client.js';
import { clicks, links, users } from './schema.js';
import type { Link, NewClick } from './schema.js';

export const DEMO_PASSWORD = 'Demo@1234';
export const DEMO_EMAILS = ['demo1@example.com', 'demo2@example.com'] as const;

const CLICKS_PER_ACTIVE_LINK = 500;
const CLICK_DAYS = 30;
const CLICK_INSERT_BATCH_SIZE = 500;
const DAY_MS = 24 * 60 * 60 * 1_000;

type LinkState = 'active' | 'expired' | 'disabled';

interface SeedLinkDefinition {
  alias: string;
  destinationUrl: string;
  state: LinkState;
  createdAtDaysAgo: number;
}

interface DemoUserDefinition {
  email: (typeof DEMO_EMAILS)[number];
  links: SeedLinkDefinition[];
}

const DEMO_USERS: DemoUserDefinition[] = [
  {
    email: 'demo1@example.com',
    links: [
      {
        alias: 'demo1-docs',
        destinationUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP',
        state: 'active',
        createdAtDaysAgo: 42,
      },
      {
        alias: 'demo1-blog',
        destinationUrl: 'https://github.com/drizzle-team/drizzle-orm',
        state: 'active',
        createdAtDaysAgo: 35,
      },
      {
        alias: 'demo1-launch',
        destinationUrl: 'https://react.dev/blog',
        state: 'active',
        createdAtDaysAgo: 28,
      },
      {
        // Explicit custom alias.
        alias: 'demo1-portfolio',
        destinationUrl: 'https://www.typescriptlang.org/docs/handbook/intro.html',
        state: 'active',
        createdAtDaysAgo: 21,
      },
      {
        alias: 'demo1-newsletter',
        destinationUrl: 'https://vite.dev/guide/',
        state: 'active',
        createdAtDaysAgo: 14,
      },
      {
        alias: 'demo1-github',
        destinationUrl: 'https://github.com/nodejs/node',
        state: 'active',
        createdAtDaysAgo: 7,
      },
      {
        // Inserted directly with a past expiry because the API rejects it.
        alias: 'demo1-expired',
        destinationUrl: 'https://www.postgresql.org/docs/current/',
        state: 'expired',
        createdAtDaysAgo: 40,
      },
      {
        alias: 'demo1-disabled',
        destinationUrl: 'https://tailwindcss.com/docs/installation',
        state: 'disabled',
        createdAtDaysAgo: 30,
      },
    ],
  },
  {
    email: 'demo2@example.com',
    links: [
      {
        alias: 'demo2-docs',
        destinationUrl: 'https://nodejs.org/en/docs',
        state: 'active',
        createdAtDaysAgo: 45,
      },
      {
        alias: 'demo2-blog',
        destinationUrl: 'https://www.postgresql.org/docs/current/sql-select.html',
        state: 'active',
        createdAtDaysAgo: 33,
      },
      {
        alias: 'demo2-launch',
        destinationUrl: 'https://react.dev/reference/react',
        state: 'active',
        createdAtDaysAgo: 26,
      },
      {
        // Explicit custom alias.
        alias: 'demo2-portfolio',
        destinationUrl: 'https://vite.dev/config/',
        state: 'active',
        createdAtDaysAgo: 19,
      },
      {
        alias: 'demo2-newsletter',
        destinationUrl: 'https://tailwindcss.com/docs/responsive-design',
        state: 'active',
        createdAtDaysAgo: 12,
      },
      {
        alias: 'demo2-github',
        destinationUrl: 'https://github.com/microsoft/TypeScript',
        state: 'active',
        createdAtDaysAgo: 5,
      },
      {
        // Inserted directly with a past expiry because the API rejects it.
        alias: 'demo2-expired',
        destinationUrl: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
        state: 'expired',
        createdAtDaysAgo: 38,
      },
      {
        alias: 'demo2-disabled',
        destinationUrl: 'https://www.postgresql.org/docs/current/indexes.html',
        state: 'disabled',
        createdAtDaysAgo: 25,
      },
    ],
  },
];

interface WeightedProfile {
  weight: number;
}

const DEVICE_PROFILES = [
  { deviceType: 'desktop', browser: 'Chrome', os: 'Windows', weight: 38 },
  { deviceType: 'desktop', browser: 'Firefox', os: 'Linux', weight: 11 },
  { deviceType: 'desktop', browser: 'Safari', os: 'macOS', weight: 12 },
  { deviceType: 'desktop', browser: 'Edge', os: 'Windows', weight: 9 },
  { deviceType: 'mobile', browser: 'Mobile Safari', os: 'iOS', weight: 14 },
  { deviceType: 'mobile', browser: 'Chrome', os: 'Android', weight: 10 },
  { deviceType: 'tablet', browser: 'Safari', os: 'iOS', weight: 4 },
  { deviceType: 'tablet', browser: 'Chrome', os: 'Android', weight: 2 },
  { deviceType: 'bot', browser: 'Googlebot', os: 'Linux', weight: 2 },
] as const satisfies ReadonlyArray<WeightedProfile & Record<string, unknown>>;

const REFERRERS = [
  { host: null, weight: 32 },
  { host: 'twitter.com', weight: 18 },
  { host: 'google.com', weight: 20 },
  { host: 'linkedin.com', weight: 15 },
  { host: 'reddit.com', weight: 15 },
] as const satisfies ReadonlyArray<WeightedProfile & { host: string | null }>;

/** Small deterministic PRNG so repeated seeds produce the same shape of data. */
function createRng(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;

    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function hashSeed(value: string): number {
  return createHash('sha256').update(value).digest().readUInt32LE(0);
}

function pickWeighted<T extends WeightedProfile>(items: readonly T[], rng: () => number): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng() * totalWeight;

  for (const item of items) {
    roll -= item.weight;

    if (roll <= 0) {
      return item;
    }
  }

  const last = items[items.length - 1];

  if (!last) {
    throw new Error('Cannot pick from an empty list');
  }

  return last;
}

/** Split clicks over 30 days with a linear bias towards the most recent days. */
function clicksPerDay(total: number, days: number): number[] {
  const weights = Array.from({ length: days }, (_, index) => index + 1);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const counts = weights.map((weight) => Math.floor((total * weight) / totalWeight));
  let remainder = total - counts.reduce((sum, count) => sum + count, 0);

  for (let index = 0; remainder > 0; index += 1) {
    const target = days - 1 - (index % days);
    counts[target] = (counts[target] ?? 0) + 1;
    remainder -= 1;
  }

  return counts;
}

function clickTimes(now: Date, counts: number[], rng: () => number): Date[] {
  const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const times: Date[] = [];

  counts.forEach((count, dayIndex) => {
    const dayStart = todayStart - (counts.length - 1 - dayIndex) * DAY_MS;
    const dayEnd = Math.min(dayStart + DAY_MS, now.getTime() + 1);
    const span = Math.max(1, dayEnd - dayStart);

    for (let index = 0; index < count; index += 1) {
      times.push(new Date(dayStart + Math.floor(rng() * span)));
    }
  });

  return times;
}

function visitorPool(alias: string, rng: () => number): string[] {
  const size = 70 + Math.floor(rng() * 90);

  return Array.from({ length: size }, (_, index) =>
    createHash('sha256').update(`snip-demo:${alias}:visitor:${index}`).digest('hex'),
  );
}

function pickVisitor(visitors: string[], rng: () => number): string {
  const visitor = visitors[Math.floor(rng() * visitors.length)];

  if (!visitor) {
    throw new Error('Visitor pool is empty');
  }

  return visitor;
}

function buildReferrerUrl(host: string | null, rng: () => number): string | null {
  if (host === null) {
    return null;
  }

  const id = Math.floor(rng() * 1_000_000_000);

  switch (host) {
    case 'twitter.com':
      return `https://twitter.com/snipdev/status/${id}`;
    case 'google.com':
      return `https://google.com/search?q=snip+url+shortener&start=${id % 100}`;
    case 'linkedin.com':
      return `https://linkedin.com/posts/snipdev-url-shortener-${id}`;
    case 'reddit.com':
      return `https://reddit.com/r/webdev/comments/${id}/snip/`;
    default:
      return `https://${host}/`;
  }
}

function buildClicks(link: Link, now: Date): NewClick[] {
  const rng = createRng(hashSeed(link.alias));
  const counts = clicksPerDay(CLICKS_PER_ACTIVE_LINK, CLICK_DAYS);
  const times = clickTimes(now, counts, rng);
  const visitors = visitorPool(link.alias, rng);

  return times.map((clickedAt, index) => {
    // The first few rows guarantee that every profile and referrer appears,
    // even for a small number of clicks.
    const profile = DEVICE_PROFILES[index] ?? pickWeighted(DEVICE_PROFILES, rng);
    const referrer = REFERRERS[index] ?? pickWeighted(REFERRERS, rng);

    return {
      linkId: link.id,
      clickedAt,
      referrerHost: referrer.host,
      referrerUrl: buildReferrerUrl(referrer.host, rng),
      deviceType: profile.deviceType,
      browser: profile.browser,
      os: profile.os,
      visitorHash: pickVisitor(visitors, rng),
    };
  });
}

async function insertClicks(events: NewClick[]): Promise<void> {
  for (let index = 0; index < events.length; index += CLICK_INSERT_BATCH_SIZE) {
    await db.insert(clicks).values(events.slice(index, index + CLICK_INSERT_BATCH_SIZE));
  }
}

function printSummary(seededLinks: Link[], totalClicks: number): void {
  const sampleLinks = seededLinks
    .filter((link) => link.isActive && link.expiresAt === null)
    .slice(0, 4)
    .map((link) => `  ${buildShortUrl(link.alias)} -> ${link.destinationUrl}`);

  const lines = [
    '',
    'Demo data ready (local development only)',
    `  ${DEMO_EMAILS[0]} / ${DEMO_PASSWORD}`,
    `  ${DEMO_EMAILS[1]} / ${DEMO_PASSWORD}`,
    '',
    `  ${DEMO_EMAILS.length} users, ${seededLinks.length} links, ${totalClicks} clicks`,
    '',
    'Sample short links:',
    ...sampleLinks,
    '',
  ];

  process.stdout.write(`${lines.join('\n')}\n`);
}

async function seed(): Promise<void> {
  const now = new Date();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const seededUsers: Array<{ id: string; email: string }> = [];

  for (const definition of DEMO_USERS) {
    const [user] = await db
      .insert(users)
      .values({ email: definition.email, passwordHash })
      .onConflictDoUpdate({ target: users.email, set: { passwordHash } })
      .returning({ id: users.id, email: users.email });

    if (!user) {
      throw new Error(`Failed to create demo user ${definition.email}`);
    }

    seededUsers.push(user);
  }

  // Reset only the demo accounts' links. Clicks cascade with their links, so
  // re-running the seed replaces data instead of duplicating it.
  await db.delete(links).where(
    inArray(
      links.userId,
      seededUsers.map((user) => user.id),
    ),
  );

  const seededLinks: Link[] = [];

  for (const definition of DEMO_USERS) {
    const user = seededUsers.find((candidate) => candidate.email === definition.email);

    if (!user) {
      throw new Error(`Missing demo user ${definition.email}`);
    }

    for (const linkDefinition of definition.links) {
      const createdAt = new Date(now.getTime() - linkDefinition.createdAtDaysAgo * DAY_MS);
      const [link] = await db
        .insert(links)
        .values({
          userId: user.id,
          alias: linkDefinition.alias,
          destinationUrl: linkDefinition.destinationUrl,
          isActive: linkDefinition.state !== 'disabled',
          expiresAt:
            linkDefinition.state === 'expired' ? new Date(now.getTime() - 2 * DAY_MS) : null,
          createdAt,
          updatedAt: createdAt,
        })
        .returning();

      if (!link) {
        throw new Error(`Failed to create demo link ${linkDefinition.alias}`);
      }

      seededLinks.push(link);
    }
  }

  const activeLinks = seededLinks.filter(
    (link) =>
      link.isActive && (link.expiresAt === null || link.expiresAt.getTime() > now.getTime()),
  );
  let totalClicks = 0;

  for (const link of activeLinks) {
    const events = buildClicks(link, now);
    await insertClicks(events);
    totalClicks += events.length;
  }

  logger.info(
    { users: seededUsers.length, links: seededLinks.length, clicks: totalClicks },
    'Seed complete',
  );
  printSummary(seededLinks, totalClicks);
}

seed()
  .catch((error: unknown) => {
    logger.error({ err: error }, 'Seed failed');
    process.exitCode = 1;
  })
  .finally(() => closeDb());
