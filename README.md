# Snip — URL shortener with analytics

Snip is a full-stack URL shortener: create compact links, share them, and see how they perform.
Every click is recorded after the redirect is served, so analytics never slow down the redirect
path. The project is built as an npm-workspaces monorepo with a React client and an Express API.

> **Status:** authentication complete. The API now supports registration, login, logout, and
> session lookup with bcrypt-hashed passwords and an httpOnly JWT cookie. Link management,
> redirects, analytics, and QR codes are next.

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

### Planned

Link management, redirect, analytics, and QR endpoints will be documented here as they are
implemented. The short-link redirect is served from the root path (`GET /:alias`).

## Architecture

The API is layered: **routes → controllers → services → repositories**. Route handlers stay thin;
business rules live in services, and SQL lives in repositories. Cross-cutting concerns (environment
config, logging, error handling) live in `config/`, `lib/`, and `middleware/`.

### Redirect and click tracking

The redirect path performs an in-memory LRU lookup (60-second TTL) before falling back to a single
indexed query. Click events are written to an in-process queue and batch-inserted after the response
has been sent, so analytics can never block or fail a redirect. Cache entries are invalidated on
edit, disable, enable, and delete.

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
- Planned: per-user link rate limits, destination allow-listing (HTTP/HTTPS only), and hashed
  visitor IDs with no raw IP storage.

## Design decisions and assumptions

- **npm workspaces**: one lockfile and root scripts, while each workspace keeps its own dependencies.
- **Single root `.env`**: shared by the API, Drizzle CLI, and tooling; loaded relative to the repo.
- **20 links/hour default rate limit**: configurable via environment without a code change.
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

1. Link CRUD with ownership checks and rate limiting.
2. Redirect path with cache, expiry/disabled pages, and click queue.
3. Analytics aggregation and dashboard charts.
4. QR codes and unique-visitor reporting.
