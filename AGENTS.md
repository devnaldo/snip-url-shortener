# Project: Snip — URL Shortener with Analytics

You are building a full-stack URL shortener for an internship assignment. Goal: a production-quality, well-tested URL shortener.  quality code, architecture, completeness, performance, best practices. Optimize for correctness, clarity and verifiable engineering over feature count.

## Stack (do not deviate)
- Monorepo: /server (Node 20, Express, TypeScript strict), /client (React + Vite + TypeScript + Tailwind + Recharts), docker-compose.yml for Postgres.
- DB: Postgres with Drizzle ORM and SQL migrations committed to the repo.
- Validation: Zod on every API input (body, params, query). Return consistent errors:
  { "error": { "code": "VALIDATION_ERROR", "message": "...", "fields": { "alias": "..." } } }
- Auth: email + password, bcrypt (cost 12), JWT in an httpOnly, SameSite cookie. No third-party auth.
- Tests: Vitest + Supertest. Libs: ua-parser-js, qrcode, nanoid, express-rate-limit, helmet, cors, pino.

## Core requirements (all must be met)
1. Create short links: auto-generated alias (7-char nanoid, retry on unique-constraint collision) OR custom alias, plus optional expiry date (must be in the future).
2. GET /:alias redirects to the original URL. Expired or disabled links render a clear HTML page (HTTP 410). Unknown alias renders a 404 page.
3. Every click records: timestamp, referrer, device type (desktop/mobile/tablet/bot/unknown), browser, OS.
4. Analytics per link: clicks over time (chart, gap-filled by day), top referrers, device split, browser split.
5. Users manage only their own links: edit destination, disable/enable, delete. Accessing another user's link returns 404.

## The two things the graders will look at closely
A. REDIRECT IS FAST AND NEVER WAITS FOR ANALYTICS
   - Redirect path = in-memory LRU cache lookup (TTL 60s), fall back to one indexed DB query, respond 302 immediately.
   - Click recording happens AFTER the response is sent via an in-process queue with batched inserts (flush every 1s or 100 events, and on graceful shutdown). Queue failures are logged and must never affect the redirect.
   - Invalidate/update the cache entry on edit, disable, enable and delete.
   - Use 302, not 301, so every click reaches the server. Explain this in the README.
B. LINK CREATION IS RATE-LIMITED PER USER, AND ONLY http/https DESTINATIONS ARE ALLOWED
   - Rate limit POST /api/links keyed by authenticated user id (default 20 per hour, configurable via env). Return 429 with Retry-After and a clear message.
   - Also rate-limit login/register by IP.
   - Destination validation on the server using the WHATWG URL parser: protocol must be exactly http: or https:, max 2048 chars, no embedded credentials, reject javascript:, data:, file:, ftp:, etc. Reject destinations whose host is this app's own host (prevents redirect loops). Reject localhost and private/loopback IP literals.
   - Custom alias: 3-32 chars, [A-Za-z0-9_-], case-sensitive, unique, and not in a reserved list (api, health, login, register, dashboard, admin, static, assets, favicon.ico, robots.txt).

## Stretch goals (implement both)
- QR code per link (GET /api/links/:id/qr returns PNG or SVG; show in UI with a download button).
- Unique visitors vs total clicks. Visitor id = sha256(ip + user-agent + daily-rotating salt derived from a server secret). NEVER store raw IPs. Show both numbers in analytics.

## Data model
users(id uuid pk, email unique, password_hash, created_at)
links(id uuid pk, user_id fk, alias unique, destination_url, is_active bool default true, expires_at nullable, created_at, updated_at)
clicks(id bigserial pk, link_id fk on delete cascade, clicked_at timestamptz, referrer_host nullable, referrer_url nullable, device_type, browser, os, visitor_hash)
Indexes: links(alias) unique; links(user_id, created_at desc); clicks(link_id, clicked_at).

## Engineering rules
- TypeScript strict, no `any`. Layered structure: routes -> controllers -> services -> repositories. Keep business logic out of route handlers.
- Central error-handling middleware; never leak stack traces or DB errors to clients.
- Config only via environment variables, validated at startup with Zod. Never commit secrets. Keep .env.example complete and in sync.
- Security: helmet, CORS restricted to CLIENT_URL with credentials, parameterized queries only, no user-controlled HTML (escape everything in the expired/404 pages).
- Frontend: mobile-first responsive layout (works at 360px width), loading and empty states, server validation errors shown next to the relevant field, toast for success/failure.
- Commits: small, frequent, conventional style (feat:, fix:, test:, docs:, chore:). Commit after each logical unit. Never produce one giant commit.
- After each task: run typecheck, lint and tests, then summarize what changed and what is next. If something in the spec is ambiguous, pick the safer option and note it in the README.
- Do not add features outside this spec.