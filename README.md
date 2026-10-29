# Snip — URL shortener with analytics

Snip is a full-stack URL shortener: create compact links, share them, and see how they perform.
Every click is recorded after the redirect is served, so analytics never slow down the redirect
path. The project is built as an npm-workspaces monorepo with a React client and an Express API.

> **Status:** authentication, link management, redirects, analytics, QR codes, and the React client
> are complete. The API supports registration, login, logout, session lookup, link creation with
> custom or generated aliases, paginated listing with click totals, editing, deletion, cached
> redirects that record clicks without blocking the response, per-link analytics, and downloadable
> SVG QR codes. The client provides guarded auth screens, a responsive link dashboard, analytics
> charts, and QR download.

## Stack

| Layer    | Technology                                                                   |
| -------- | ---------------------------------------------------------------------------- |
| Server   | Node.js 20+, Express 5, TypeScript (strict), Zod, pino                       |
| Database | PostgreSQL 16, Drizzle ORM, SQL migrations committed to the repo             |
| Client   | React 19, React Router, Vite, TypeScript, Tailwind CSS, Recharts             |
| Testing  | Vitest, Supertest                                                            |
| Tooling  | npm workspaces, ESLint (type-aware), Prettier, Docker Compose for PostgreSQL |

## Project structure

```text
.
├── client/                 # React + Vite frontend
│   ├── public/             # Static assets
│   └── src/
│       ├── api/            # Typed fetch client and response types
│       ├── auth/           # Session provider, hooks, route guards
│       ├── components/     # Layout, forms, modals, charts
│       ├── lib/            # Dates, formatting, clipboard, styles
│       ├── pages/          # Auth, dashboard, analytics screens
│       └── toast/          # Accessible toast notifications
├── server/                 # Express API
│   ├── drizzle/            # Generated SQL migrations (committed)
│   ├── src/
│   │   ├── config/         # Environment loading and validation
│   │   ├── controllers/    # HTTP request/response handling
│   │   ├── db/             # Drizzle client, schema, seed script
│   │   ├── errors/         # Typed application errors
│   │   ├── lib/            # Shared infrastructure (logger, cache, queue)
│   │   ├── middleware/     # Error handling and cross-cutting concerns
│   │   ├── routes/         # Express routers
│   │   └── app.ts          # App composition
│   └── test/               # Vitest + Supertest suites
├── docker-compose.yml      # Local PostgreSQL
├── .env.example            # Every supported environment variable
└── package.json            # Workspace scripts
```

## Getting started

### Prerequisites

- Node.js 20 or newer (see `.nvmrc`)
- npm 10 or newer
- Docker with the Compose plugin, for the local database

Docker Desktop bundles the Compose plugin. On Linux, install the `docker-compose-plugin` package
from Docker's repository (or use a recent Docker Engine package that includes it) and verify it is
available:

```bash
docker compose version
```

If only the legacy standalone binary is installed, the commands in this README use the modern
`docker compose` form; substitute `docker-compose` if that is what your machine provides.

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the environment

```bash
cp .env.example .env
```

Replace both secrets in `.env` before running anything outside local development:

```bash
openssl rand -hex 32
```

The server validates every variable at startup and refuses to start with a clear error if any are
missing or malformed.

### 3. Start PostgreSQL

```bash
npm run db:up
```

The compose stack exposes PostgreSQL on `localhost:5432` with the development credentials used by
`DATABASE_URL`. Compose also accepts optional `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`,
and `POSTGRES_PORT` overrides; the defaults match `.env.example`.

> The credentials in `docker-compose.yml` and `.env.example` are for local development only. They
> are not secrets and must not be reused for a deployed database.

### 4. Migrate and seed

```bash
npm run migrate
npm run seed   # optional demo accounts, links, and click history
```

The seed is idempotent and safe to run repeatedly: it upserts the demo users, replaces only those
users' links, and regenerates their clicks. Re-running it does not duplicate rows.

### Demo accounts

`npm run seed` creates two local-only accounts:

| Email               | Password    |
| ------------------- | ----------- |
| `demo1@example.com` | `Demo@1234` |
| `demo2@example.com` | `Demo@1234` |

Each account has eight readable links: six active links with about 500 clicks spread over the last
30 days, one expired link (inserted directly with a past expiry because the API rejects past dates),
and one disabled link. Clicks include Direct, twitter.com, google.com, linkedin.com, and reddit.com
referrers plus a mix of desktop, mobile, tablet, and bot traffic.

Sample short links after seeding (using the default `BASE_URL`):

- <http://localhost:3000/demo1-docs>
- <http://localhost:3000/demo1-launch>
- <http://localhost:3000/demo1-portfolio>
- <http://localhost:3000/demo2-docs>

### 5. Run the apps

```bash
npm run dev
```

- Client: <http://localhost:5173>
- API: <http://localhost:3000>
- Health check: <http://localhost:3000/health>

The Vite dev server proxies `/api` and `/health` to the API, so the client can use relative URLs.

## Environment variables

| Variable                    | Required | Default       | Description                                                      |
| --------------------------- | -------- | ------------- | ---------------------------------------------------------------- |
| `NODE_ENV`                  | no       | `development` | `development`, `test`, or `production`.                          |
| `PORT`                      | no       | `3000`        | Port the API listens on.                                         |
| `DATABASE_URL`              | yes      | —             | PostgreSQL connection string (`postgres://` or `postgresql://`). |
| `BASE_URL`                  | yes      | —             | Public origin used to build short links.                         |
| `CLIENT_URL`                | yes      | —             | Frontend origin allowed by CORS.                                 |
| `JWT_SECRET`                | yes      | —             | Auth token signing key, minimum 32 characters.                   |
| `CLICK_HASH_SECRET`         | yes      | —             | Secret used to derive the daily salt for visitor hashes.         |
| `TRUST_PROXY`               | no       | `0`           | Number of trusted reverse-proxy hops for the client IP.          |
| `LINK_RATE_LIMIT_MAX`       | no       | `20`          | Maximum links a user may create per window.                      |
| `LINK_RATE_LIMIT_WINDOW_MS` | no       | `3600000`     | Link-creation rate-limit window in milliseconds.                 |

Never commit `.env`. It is ignored by Git; `.env.example` is the source of truth for configuration.
The default `DATABASE_URL` matches `docker-compose.yml`; those credentials are for local
development only and are not suitable for a deployed database.

## Scripts

| Command                    | Description                                         |
| -------------------------- | --------------------------------------------------- |
| `npm run dev`              | Run the API and client together.                    |
| `npm run build`            | Build the server and client for production.         |
| `npm start`                | Start the compiled API.                             |
| `npm test`                 | Run all workspace test suites.                      |
| `npm run typecheck`        | Type-check every workspace.                         |
| `npm run lint`             | Lint the repository with zero warnings allowed.     |
| `npm run format`           | Format the repository with Prettier.                |
| `npm run migrate`          | Apply committed SQL migrations.                     |
| `npm run migrate:generate` | Generate a migration from the Drizzle schema.       |
| `npm run seed`             | Insert the demo accounts, links, and click history. |
| `npm run db:up`            | Start PostgreSQL with Docker Compose.               |
| `npm run db:down`          | Stop the compose stack.                             |

## API

All API errors use one shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "fields": { "alias": "Alias is required" }
  }
}
```

### Implemented

#### `GET /health`

Returns `200` with `{ "status": "ok", "service": "snip-api", "uptime": 12, "timestamp": "..." }`.

#### Authentication

Auth responses set a `snip_token` cookie: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in
production, with a seven-day expiry. The cookie contains a signed HS256 JWT; no token is ever
returned in a JSON body. Request bodies are validated with Zod.

| Endpoint                  | Request body              | Success                                      | Errors                                                                |
| ------------------------- | ------------------------- | -------------------------------------------- | --------------------------------------------------------------------- |
| `POST /api/auth/register` | `{ "email", "password" }` | `201` `{ "user": { id, email, createdAt } }` | `400 VALIDATION_ERROR`, `409 EMAIL_TAKEN`, `429 RATE_LIMITED`         |
| `POST /api/auth/login`    | `{ "email", "password" }` | `200` `{ "user": { id, email, createdAt } }` | `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS`, `429 RATE_LIMITED` |
| `POST /api/auth/logout`   | —                         | `204` and an expired cookie                  | —                                                                     |
| `GET /api/auth/me`        | — (cookie required)       | `200` `{ "user": { id, email, createdAt } }` | `401 UNAUTHENTICATED`                                                 |

Rules:

- Emails must be valid and are normalized to lowercase; the database enforces uniqueness.
- Passwords must be 8–72 characters. The upper bound matches bcrypt's 72-byte input limit.
- Passwords are hashed with bcrypt at cost 12; hashes are never returned by the API.
- Login failures return the same generic error whether the email or the password is wrong.
- Registration is limited to 5 attempts per IP per hour. Login is limited to 10 attempts per IP
  per 15 minutes; successful logins do not count toward the limit. Both return `429` with a
  `Retry-After` header.
- JWT tokens expire after seven days. Logout clears the cookie; tokens are stateless, so there is
  no server-side session store.

#### Links

All link endpoints require the auth cookie. Every query is scoped to the authenticated user; an
id belonging to someone else returns `404 LINK_NOT_FOUND`, never `403`.

| Endpoint                       | Request body                                 | Success                                         | Errors                                                        |
| ------------------------------ | -------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| `POST /api/links`              | `{ destinationUrl, alias?, expiresAt? }`     | `201` `{ "link": { ... } }`                     | `400 VALIDATION_ERROR`, `409 ALIAS_TAKEN`, `429 RATE_LIMITED` |
| `GET /api/links`               | query: `page`, `limit`                       | `200` `{ "links": [...], "pagination": {...} }` | `400 VALIDATION_ERROR`                                        |
| `GET /api/links/:id`           | —                                            | `200` `{ "link": { ... } }`                     | `400 VALIDATION_ERROR`, `404 LINK_NOT_FOUND`                  |
| `GET /api/links/:id/analytics` | query: `range`                               | `200` analytics object                          | `400 VALIDATION_ERROR`, `404 LINK_NOT_FOUND`                  |
| `GET /api/links/:id/qr`        | —                                            | `200` SVG image                                 | `400 VALIDATION_ERROR`, `404 LINK_NOT_FOUND`                  |
| `PATCH /api/links/:id`         | `{ destinationUrl?, expiresAt?, isActive? }` | `200` `{ "link": { ... } }`                     | `400 VALIDATION_ERROR`, `404 LINK_NOT_FOUND`                  |
| `DELETE /api/links/:id`        | —                                            | `204`                                           | `400 VALIDATION_ERROR`, `404 LINK_NOT_FOUND`                  |

### Analytics

`GET /api/links/:id/analytics?range=7d|30d|90d` returns range-scoped analytics for one owned link.
The default range is `7d`. Ranges cover the current UTC day plus the preceding 6, 29, or 89 days;
`from` is inclusive and `to` is exclusive. An id belonging to another user returns
`404 LINK_NOT_FOUND`.

```json
{
  "linkId": "e2c1…",
  "range": "7d",
  "from": "2026-10-22T00:00:00.000Z",
  "to": "2026-10-29T00:00:00.000Z",
  "totals": { "totalClicks": 120, "uniqueVisitors": 87 },
  "clicksOverTime": [{ "date": "2026-10-22", "clicks": 0 }],
  "topReferrers": [{ "referrer": "news.example.org", "clicks": 42 }],
  "deviceSplit": [{ "deviceType": "mobile", "clicks": 70 }],
  "browserSplit": [{ "browser": "Chrome", "clicks": 55 }]
}
```

- `clicksOverTime` always contains one entry per UTC day in the range, including zero-click days.
  `generate_series` builds the calendar in PostgreSQL and the gap fill is a `LEFT JOIN`, not an
  application-side loop.
- `totals` counts rows and distinct `visitor_hash` values in the same window.
- `topReferrers` returns at most 10 hosts ordered by clicks; clicks without a referrer are grouped
  as `Direct`.
- `deviceSplit` and `browserSplit` are ordered by clicks descending.
- Every aggregation runs in SQL over the `(link_id, clicked_at)` index.

### QR codes

`GET /api/links/:id/qr` returns an SVG QR code for the link's short URL with
`Content-Type: image/svg+xml`. The response is marked `Cache-Control: private, max-age=86400` and
names the download `snip-<alias>.svg`. Like every link endpoint, it requires the auth cookie and
returns `404 LINK_NOT_FOUND` for another user's link.

Link objects contain `id`, `alias`, `shortUrl`, `destinationUrl`, `isActive`, `expiresAt`,
`createdAt`, and `updatedAt`. List items additionally include `clickCount`, aggregated from the
clicks table. `shortUrl` is derived from `BASE_URL`. List results are newest first and return
`pagination: { page, limit, total, totalPages }`; defaults are `page=1`, `limit=20`, and `limit`
is capped at 100.

Validation rules:

- Destinations must be absolute `http://` or `https://` URLs, at most 2048 characters, with no
  embedded credentials. The app's own host, `localhost`, and private/loopback IP literals are
  rejected. Validation uses the WHATWG URL parser, so alternate IPv4 spellings are normalized
  before checks.
- Custom aliases are 3–32 characters from `[A-Za-z0-9_-]`, unique with case-sensitive matching,
  and cannot be a reserved word (`api`, `health`, `login`, `register`, `dashboard`, `admin`,
  `static`, `assets`, `favicon.ico`, `robots.txt`). Reserved words are checked case-insensitively.
- Without an alias, a 7-character nanoid is generated; insert collisions are retried up to five
  times.
- `expiresAt` must be an ISO 8601 timestamp in the future. `PATCH` accepts `null` to remove an
  expiry and requires at least one editable field.
- `POST /api/links` is rate-limited per authenticated user (default 20 per hour, configurable via
  `LINK_RATE_LIMIT_MAX` and `LINK_RATE_LIMIT_WINDOW_MS`) and returns `429` with `Retry-After`.

### Redirects

`GET /:alias` is mounted at the server root, after `/health` and `/api`, so those prefixes always
win over an alias. It is intentionally **not** part of the `/api` surface: visitors get a `302` to
the destination, or a standalone HTML page when the link cannot be followed.

| Case                       | Status | Response                                        |
| -------------------------- | ------ | ----------------------------------------------- |
| Active link                | `302`  | `Location` set to the destination               |
| Expired link               | `410`  | HTML page explaining that the link expired      |
| Disabled link              | `410`  | HTML page explaining that the link was disabled |
| Unknown or malformed alias | `404`  | HTML page explaining that the link is missing   |

All redirect and notice responses send `Cache-Control: no-store`. Aliases are matched
case-sensitively and must be 3–32 characters from `[A-Za-z0-9_-]`; anything else is rejected
before a database query.

Clicks are recorded with the timestamp, referrer host and URL (http/https only), device type
(`desktop`, `mobile`, `tablet`, `bot`, or `unknown`), browser, OS, and a visitor hash. User agents
are parsed with `ua-parser-js`; bot detection uses its bot-detection extension. The visitor hash is
`sha256(ip + user-agent + daily salt)`, where the salt is an HMAC of the UTC date keyed by
`CLICK_HASH_SECRET`. Raw IP addresses are never stored or logged. Because the salt rotates daily,
unique-visitor counts reset at UTC midnight.

## Client

The React app in `client/` talks to the API through a small typed client (`client/src/api/`). It
always calls relative `/api` paths with `credentials: 'include'`, so the auth cookie works through
the Vite dev proxy and in a same-origin production deployment. Responses are typed, and failures
are normalized into an `ApiError` carrying the server's `code`, `message`, and optional `fields`.
Validation messages from the server are rendered next to the matching input.

| Route                  | Access    | Screen                                                      |
| ---------------------- | --------- | ----------------------------------------------------------- |
| `/login`               | Guest     | Email/password sign-in                                      |
| `/register`            | Guest     | Account creation                                            |
| `/`                    | Protected | Create-link form and paginated link management              |
| `/links/:id/analytics` | Protected | Range-scoped analytics, charts, and referrer/device/browser |

Authentication and routing:

- `AuthProvider` calls `GET /api/auth/me` on load and exposes loading, authenticated,
  unauthenticated, and error states. A failed session lookup shows a retry screen instead of
  silently signing the user out.
- `RequireAuth` redirects unauthenticated visitors to `/login` and remembers the attempted path;
  `GuestRoute` sends authenticated users back to the dashboard. Any `401` from the API clears the
  session so an expired cookie cannot leave the UI in a stale state.
- The session error is distinct from an API failure: network/server failures offer a retry, while
  an actual `401` is treated as signed out.

Dashboard:

- Create a link with a destination, optional custom alias, and optional expiry. Server field
  errors appear inline, while rate-limit and other request failures also surface as toasts.
- Links render as cards below `md` and as a table from `md` upward. Each row supports copy,
  enable/disable (switch), edit, delete with confirmation, QR display, and analytics.
- Deleting the last item on a page moves back one page; the list refreshes after mutations so
  pagination totals stay accurate.

Analytics and QR:

- The range selector switches between `7d`, `30d`, and `90d` without a full page reload. Totals,
  the gap-filled line chart, top referrers, device donut, and browser bars all come from the
  server-side aggregation endpoint.
- The analytics route is lazy-loaded, so Recharts is not part of the initial dashboard bundle.
- QR codes are fetched from the authenticated endpoint as a blob, displayed as an SVG, and
  downloaded as `snip-<alias>.svg` without exposing the cookie to a third party.

The layout is mobile-first and designed from a 360px viewport upward: stacked forms, card lists,
wrapping action buttons, full-width range controls, scrollable tables on medium screens, and
bottom-sheet modals on phones. Modals trap focus, close on Escape or backdrop click, and restore
focus to the trigger. Inputs use explicit labels, `aria-invalid`, and linked error text; toasts use
a live region; toggle switches expose `role="switch"`.

## Architecture

The API is layered: **routes → controllers → services → repositories**. Route handlers stay thin;
business rules live in services, and SQL lives in repositories. Cross-cutting concerns (environment
config, logging, error handling) live in `config/`, `lib/`, and `middleware/`.

### Redirect and click tracking

The redirect path performs an in-memory LRU lookup (60-second TTL) before falling back to a single
indexed query. Click events are written to an in-process queue and batch-inserted after the response
has been sent, so analytics can never block or fail a redirect. The queue flushes every second, when
100 events are buffered, or on graceful shutdown; it is bounded at 10,000 events, and a failed
insert is logged and discarded. Cache entries are invalidated on edit, disable, enable, and delete.

`TRUST_PROXY` controls how many reverse-proxy hops Express trusts when deriving `req.ip` from
`X-Forwarded-For`. It defaults to `0` (direct connections only). Set it to the exact number of
proxies in front of the API; trusting more hops than exist lets clients spoof their IP.

### Why `302` instead of `301`

A `301` is cached permanently by browsers, which means later clicks never reach the server and
analytics become incomplete. Snip uses `302` so every click hits the API, is recorded, and is then
redirected to the destination. The trade-off is a small extra request per click, acceptable for an
analytics product.

## Database

- Schema: `server/src/db/schema.ts`
- Migrations: `server/drizzle/` (generated, committed)
- Seed: `server/src/db/seed.ts`

Change the schema, run `npm run migrate:generate`, review the generated SQL, then apply it with
`npm run migrate`.

### Data model

PostgreSQL stores three tables. All timestamps are `timestamptz`; UUID primary keys use
`gen_random_uuid()`.

| Table    | Columns                                                                                                                                                                       |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`  | `id` uuid PK, `email` varchar(320) unique, `password_hash` text, `created_at` timestamptz                                                                                     |
| `links`  | `id` uuid PK, `user_id` uuid FK → `users.id`, `alias` varchar(32), `destination_url` text, `is_active` boolean, `expires_at` timestamptz nullable, `created_at`, `updated_at` |
| `clicks` | `id` bigserial PK, `link_id` uuid FK → `links.id`, `clicked_at` timestamptz, `referrer_host`, `referrer_url`, `device_type`, `browser`, `os`, `visitor_hash`                  |

Relationships and indexes:

- One user owns many links; one link has many clicks. Deleting a user cascades to links, and
  deleting a link cascades to its clicks.
- `links_alias_unique_idx` is a unique index on `links(alias)`. Alias uniqueness is case-sensitive.
- `links_user_created_idx` on `links(user_id, created_at DESC)` supports paginated per-user lists.
- `clicks_link_clicked_idx` on `clicks(link_id, clicked_at)` supports every analytics window and
  keeps the redirect's alias lookup independent of click volume.
- Clicks are append-only. Analytics totals, daily buckets, referrers, and device/browser splits are
  aggregated in SQL rather than maintained in denormalized counters.

### Seed data

`npm run seed` is idempotent. It upserts `demo1@example.com` and `demo2@example.com`, deletes only
those users' links (clicks cascade), and reinserts the demo links and generated click history. It
never touches other accounts, and re-running it does not create duplicates.

- Password for both accounts: `Demo@1234`.
- Each account has eight links: six active, one expired, and one disabled.
- Active links receive 500 deterministic demo clicks spread over the last 30 UTC days, weighted
  toward recent days, with Direct, twitter.com, google.com, linkedin.com, and reddit.com referrers.
- The expired link is inserted directly with a past `expires_at`; the API intentionally rejects
  past expiry dates.
- These accounts and the compose database credentials are for local development only.

## Testing

```bash
npm test
```

Server tests use Vitest and Supertest against the Express app without binding a port. The test
suite supplies its own deterministic environment values and never touches the development database.

The integration suite (`server/test/integration.test.ts`) runs against a dedicated PostgreSQL
database, `snip_test`. The Vitest global setup creates that database if it does not exist and
applies the committed Drizzle migrations before the first test; each test then truncates the tables
so runs are isolated. Override the connection string when needed:

```bash
TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/my_test_db npm test
```

For safety, the setup refuses to run when the database name does not end in `_test`, because the
suite truncates tables. Start PostgreSQL first with `npm run db:up`.

Covered end-to-end against the real database:

- destination URL and custom alias validation (including reserved words, credentials, own-host, and
  localhost/private addresses);
- expiry and disabled links returning 410, and unknown aliases returning 404;
- per-user creation rate limiting (429 with `Retry-After`);
- ownership isolation across read, list, edit, delete, and analytics;
- redirects returning 302 before the queued click is persisted (verified with a deliberately
  blocked queue insert) and the click eventually landing with parsed UA/referrer fields;
- redirect-cache invalidation after edit, disable/enable, and delete;
- analytics aggregation, gap-filled daily buckets, half-open windows, and unique visitors.

The client is type-checked and built with `npm run typecheck --workspace=@snip/client` and
`npm run build --workspace=@snip/client`; browser-level end-to-end tests are listed under next steps.

## Security

- Helmet security headers on every response; Express fingerprinting disabled.
- CORS is restricted to the exact `CLIENT_URL` origin and allows credentials.
- Environment configuration is validated with Zod at startup.
- Errors are normalized; stack traces and database details are never sent to clients.
- Request logs redact cookies, authorization headers, and password fields.
- Passwords are hashed with bcrypt at cost 12; cookie-borne JWTs are httpOnly and SameSite=Lax.
- Login and registration are rate-limited per IP; login failures are deliberately generic.
- Link creation is rate-limited per user; destinations are allow-listed to HTTP/HTTPS and
  private/loopback targets are blocked.
- Visitor IDs are daily-rotating hashes; raw IP addresses are never persisted or logged.
- Redirect failure pages escape every interpolated value and include no user-controlled HTML.

## Design decisions and assumptions

- **npm workspaces**: one lockfile and root scripts, while each workspace keeps its own dependencies.
- **Single root `.env`**: shared by the API, Drizzle CLI, and tooling; loaded relative to the repo.
- **`302` instead of `301`**: a permanent redirect would be cached by browsers and later clicks
  would never reach the API, making analytics incomplete. A temporary redirect keeps every click
  observable; the trade-off is one extra request per click.
- **In-memory LRU cache plus a batched click queue**: the redirect path checks a 60-second LRU cache
  and falls back to one indexed query. Clicks are enqueued synchronously after the response and
  batch-inserted every second, at 100 events, or on shutdown. The queue is bounded and failures are
  logged and discarded, so analytics can never block or fail a redirect. This is intentionally a
  single-process design.
- **Redis upgrade path**: for multiple API instances, replace the LRU with a shared Redis cache
  (`GET`/`SETEX` on the alias key) and move the in-process queue to a durable Redis Stream or
  BullMQ queue drained by workers. Invalidate cache entries with `DEL` and/or a pub/sub broadcast on
  edit, disable, enable, and delete. The HTTP layer stays the same; only the cache and queue adapters
  change.
- **UTC-aligned analytics buckets**: ranges cover the current UTC day plus the preceding days,
  `from` is inclusive and `to` is exclusive, and `generate_series` fills empty days in SQL so every
  response has a fixed number of buckets. UTC avoids daylight-saving gaps and makes daily visitor
  salt rotation deterministic.
- **Per-user link-creation rate limit**: `POST /api/links` is keyed by the authenticated user id,
  not by IP, so users behind a shared NAT do not consume each other's quota. The default is 20 per
  hour and is configurable via `LINK_RATE_LIMIT_MAX` and `LINK_RATE_LIMIT_WINDOW_MS`. Login and
  registration remain IP-keyed because there is no authenticated user yet.
- **Hashed visitor IDs**: a visitor id is `sha256(ip + user-agent + daily salt)`, where the salt is
  an HMAC of the UTC date keyed by `CLICK_HASH_SECRET`. Raw IPs are never stored or logged. Unique
  visitors are distinct hashes within the selected window; because the salt rotates daily, the
  count resets at UTC midnight.
- **`404` instead of `403` for other users' links**: every read, update, delete, analytics, and QR
  query is scoped by `user_id` in SQL. Another user's link is indistinguishable from a missing link,
  so the API does not reveal that an id exists. This also avoids leaking resource ownership through
  status codes.
- **QR codes are SVG**: the server returns text-based SVG instead of rasterising a PNG, keeping the
  endpoint dependency-light and the code sharp at any display size.
- **Alias rules**: uniqueness is case-sensitive in PostgreSQL, while reserved words are checked
  case-insensitively so `/API` cannot shadow API routes.
- **Generated aliases retry on collision**: up to five insert attempts, relying on the database's
  unique index rather than a check-then-insert race.
- **Private-host blocking is literal only**: hostnames are not resolved, so DNS-based bypasses are
  out of scope for this assignment. Deployments should also restrict outbound access if needed.
- **Stateless JWT auth**: a seven-day token in an httpOnly cookie, with no session table. Logout
  removes the cookie; a stolen token could remain valid until expiry.
- **Normalized emails**: addresses are lowercased before storage and lookup, so
  `User@Example.com` and `user@example.com` cannot create separate accounts.
- **Password length cap**: 72 characters, because bcrypt ignores input beyond that limit.
- **Fixed auth rate limits**: registration (5/hour) and login (10/15 minutes) are constants; the
  spec exposes only the link-creation limit through environment variables.
- **Demo seed data is safe**: only for local development; credentials are documented and non-secret.
- **Safer defaults**: secrets must be explicitly provided and have a minimum length; there are no
  insecure fallback secrets.
- **Client and API share an origin**: the client uses relative `/api` URLs rather than a build-time
  API host. In production, serve the built client and proxy `/api` to the API from the same origin;
  this matches the `SameSite=Lax` auth cookie and avoids CORS/cookie complications.
- **Server errors drive the client forms**: the UI maps `error.fields` back to inputs instead of
  duplicating server validation rules, so the server remains the source of truth.
- **Analytics is code-split**: Recharts and the analytics screen are loaded only when that route is
  visited, keeping the initial dashboard bundle smaller.
- **QR images are authenticated blobs**: the SVG is fetched with the session cookie and rendered
  from an object URL, then revoked on close. No QR service sees the short URL or the cookie.

## What is finished

- Email/password authentication with bcrypt cost 12, httpOnly `SameSite=Lax` JWT cookies, logout,
  session lookup, and IP rate limits on register/login.
- Link management: generated or custom aliases, future-only expiry, pagination, click counts,
  editing, enable/disable, deletion, and strict per-user ownership.
- Redirects: `302` for active links, escaped `410` pages for expired/disabled links, escaped `404`
  pages for unknown aliases, a 60-second LRU cache, and cache invalidation on every mutation.
- Click tracking: asynchronous batched inserts, UA/referrer parsing, device/browser/OS fields, and
  daily-rotating hashed visitor ids without storing raw IPs.
- Analytics: totals, unique visitors, gap-filled daily buckets, top referrers, device split, browser
  split, and `7d`/`30d`/`90d` ranges.
- Per-link SVG QR codes with authenticated download.
- Responsive React client with guarded routes, inline server validation errors, toasts, link
  management, analytics charts, and QR download.
- Unit and PostgreSQL-backed integration tests, deterministic demo seed data, and this README.

## What is not finished

- Browser-level end-to-end tests (Playwright or similar) for the full register → create → redirect →
  analytics → QR flow.
- A production deployment: reverse proxy, TLS, CSP tuned to the built client, secrets management,
  backups, and a CI pipeline.
- Distributed infrastructure: the LRU cache, click queue, and rate-limit store are in-process and
  assume a single API instance.
- DNS-aware SSRF protection. Private-host blocking currently checks literals and hostnames without
  resolving DNS, so a public hostname that resolves to an internal address is out of scope.
- Account lifecycle features: email verification, password reset, account deletion, and refresh
  tokens or server-side session revocation.
- Durable analytics delivery guarantees. The queue is bounded and drops events under sustained
  database failure; there are no queue-depth metrics or alerts yet.
- OpenAPI/JSON Schema documentation and a generated API client.

## What I would do with more time

1. Add Playwright end-to-end tests and run lint, typecheck, unit, and integration tests in CI on
   every pull request.
2. Replace the in-process cache and queue with Redis (`GET`/`SETEX` plus Redis Streams or BullMQ),
   use a shared rate-limit store, and load-test the redirect path under concurrent traffic.
3. Add observability: request and redirect latency histograms, cache hit ratio, queue depth, dropped
   click counts, database slow-query logging, and alerts for queue failures.
4. Harden deployment with a same-origin reverse proxy, a strict CSP, managed secrets, automated
   backups, and migration rollback procedures.
5. Add DNS-aware destination checks and outbound egress restrictions to close the remaining SSRF
   gap.
6. Add email verification, password reset, account deletion, and token revocation for a complete
   account lifecycle.
7. Publish an OpenAPI spec and generate the client types from it so the API and UI cannot drift.

## AI tools used

OpenCode and Claude were used for scaffolding, implementation, and review. I reviewed and understand
all code in this repository, including the architecture, the redirect and click-tracking path, the
analytics SQL, the authentication and ownership rules, and the tests.
