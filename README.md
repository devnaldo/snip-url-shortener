# Snip — URL shortener with analytics

Snip is a full-stack URL shortener: create compact links, share them, and see how they perform.
Every click is recorded after the redirect is served, so analytics never slow down the redirect
path. The project is built as an npm-workspaces monorepo with a React client and an Express API.

> **Status:** authentication, link management, redirects, analytics, and QR codes complete. The API
> supports registration, login, logout, session lookup, link creation with custom or generated
> aliases, paginated listing with click totals, editing, deletion, cached redirects that record
> clicks without blocking the response, per-link analytics, and downloadable SVG QR codes. The
> client dashboard is next.

## Stack

| Layer    | Technology                                                                   |
| -------- | ---------------------------------------------------------------------------- |
| Server   | Node.js 20+, Express 5, TypeScript (strict), Zod, pino                       |
| Database | PostgreSQL 16, Drizzle ORM, SQL migrations committed to the repo             |
| Client   | React 19, Vite, TypeScript, Tailwind CSS                                     |
| Testing  | Vitest, Supertest                                                            |
| Tooling  | npm workspaces, ESLint (type-aware), Prettier, Docker Compose for PostgreSQL |

## Project structure

```text
.
├── client/                 # React + Vite frontend
│   ├── public/             # Static assets
│   └── src/                # Application source
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

### 4. Migrate and seed

```bash
npm run migrate
npm run seed   # optional demo user and links
```

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
| `npm run seed`             | Insert the demo user and sample links (idempotent). |
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

### Planned

The client dashboard — link management, analytics charts, and QR download — is still to come.

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

Seed credentials for local development only:

- Email: `demo@snip.local`
- Password: `demo-password`

Change the schema, run `npm run migrate:generate`, review the generated SQL, then apply it with
`npm run migrate`.

## Testing

```bash
npm test
```

Server tests use Vitest and Supertest against the Express app without binding a port. The test
suite supplies its own deterministic environment values and never touches the development database.

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
- **20 links/hour default rate limit**: applied per authenticated user, configurable via
  environment without a code change.
- **Link ownership is enforced in SQL**: list, count, find, update, and delete all include
  `user_id` in the `WHERE` clause, so another user's link cannot be distinguished from missing.
  Analytics and QR resolve the owned link first and return `404` before touching click data.
- **Analytics windows are UTC-aligned**: ranges end at the current UTC day, `to` is exclusive, and
  `generate_series` fills empty days in SQL so every response has a fixed number of buckets.
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

## Next steps

1. Client authentication and link-management screens.
2. Analytics dashboard with charts for clicks over time, referrers, and device/browser splits.
3. QR code display and download in the client.
