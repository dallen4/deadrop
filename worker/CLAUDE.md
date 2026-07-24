# CLAUDE.md — worker/

Cloudflare Worker using Hono framework. Provides the backend API: Redis-backed (Upstash) drop session storage, Turso-backed vaults, and a `PeerServerDO` Durable Object for PeerJS signaling — **not yet live in production**. `wrangler.toml` only routes `deadrop.nieky.dev` to this Worker; the actual production signaling host, `peers.deadrop.io` (`NEXT_PUBLIC_PEER_SERVER_URL`/`PEER_SERVER_URL`), is a separate standalone PeerJS server on Render. `PeerServerDO` is a parked experiment — the DO pattern isn't considered production-ready yet. Don't assume it's handling real traffic just because it's implemented and bound.

## Commands

```bash
pnpm dev        # wrangler dev (localhost:8787)
pnpm deploy     # wrangler deploy to production (deadrop.nieky.dev)
```

## Directory Structure

```
worker/
├── src/
│   ├── index.ts              # Entry: exports default fetch handler + PeerServerDO
│   ├── app.ts                # Hono app: middleware stack + all routes + DeadropWorkerApi type export
│   ├── constants.ts          # AppRoutes / AppRouteParts enums
│   ├── routers/
│   │   ├── auth.ts           # Clerk auth endpoints
│   │   ├── peers.ts          # PeerJS signaling (upgrades to WebSocket → Durable Object)
│   │   ├── drop.ts           # Drop CRUD (Redis-backed)
│   │   └── vault.ts          # Vault create/tokens/get/delete/lock/unlock (Turso via @shared/lib/turso)
│   └── lib/
│       ├── http/core.ts      # Hono instance + custom context/middleware types
│       ├── middleware.ts     # cors, tracing, redis, authenticated(), restricted(), service()
│       ├── billing.ts        # getUserPlan/getPlanLimits/hasFeature from Clerk claims
│       ├── messages.ts       # Message validation helpers
│       ├── durable_objects/
│       │   ├── PeerServer.ts # PeerJS signaling actor (WebSocket per peer)
│       │   ├── DropSession.ts# Drop session state DO (not active in current flow)
│       │   └── index.ts
│       ├── crypto.ts         # Validation-side crypto utilities
│       └── cache.ts          # Redis caching helpers
│  # Turso vault provisioning/lifecycle now lives in shared/lib/turso/ (see its CLAUDE.md)
├── client.ts                  # Re-exports DeadropWorkerApi type (consumed by shared/client.ts)
├── types/
│   ├── global.d.ts            # Cloudflare env bindings
│   └── worker-configuration.d.ts
├── wrangler.toml
├── tsconfig.json
└── vitest.config.mts
```

## Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check (API metadata) |
| `*` | `/auth/*` | Clerk auth endpoints |
| `*` | `/peers/*` | PeerJS signaling via `PeerServerDO` — implemented but not live (see top of file); production uses `peers.deadrop.io` on Render |
| GET/POST/DELETE | `/drop` | Drop session CRUD (Redis) |
| POST | `/vault` | Create a Turso vault database (`authenticated({ allowApiKey: true })` + `restricted()`) |
| POST | `/vault/tokens` | Mint a read-only Turso token for a vault (`authenticated({ allowApiKey: true })` + `restricted()`) |
| GET | `/vault/:name` | Get vault metadata (`authenticated({ allowApiKey: true })`) |
| DELETE | `/vault/:name` | Delete a vault (`authenticated()` + `restricted()`) |
| POST | `/vault/lock` | Lock all of a user's vaults on cancel (`service()`, `{ userId }`) |
| POST | `/vault/unlock` | Restore all of a user's vaults on reactivate (`service()`, `{ userId }`) |

## Key Patterns

### Middleware Stack (applied in `src/app.ts`, in order)
1. `cors()` — origin allowlist (`deadrop.io`, Vercel preview subdomains, `vscode-webview://`); always allows `Authorization` header
2. `tracing()` — captures request IP
3. `requestId()`
4. `clerkMiddleware()` — decodes `Authorization: Bearer <token>` *or* the Clerk session cookie into `c.var.clerkAuth()`; never throws on missing/anonymous auth
5. `redis()` — attaches an Upstash client to `c.get('redis')`

### Auth gates (`src/lib/middleware.ts`)
- The two gates are **layered, not standalone**: `authenticated()` resolves identity and `c.set('userId', ...)`; `restricted()` reads that `userId` back and gates on entitlement. A `restricted()` route must chain `authenticated()` before it, or `c.get('userId')` is undefined.
- `authenticated({ allowApiKey?: boolean })` — calls `getAuth(c, { acceptsToken: 'any' })` directly (not `c.var.clerkAuth()`, which defaults to session-tokens-only) and gates on `auth.tokenType` itself: 401s unless the type is `session_token`/`oauth_token`, or `api_key` with `allowApiKey: true`. Requesting `'any'` (rather than an `acceptsToken` array) is deliberate — a `TokenType[]` array doesn't type-narrow, so the return type keeps `m2m_token` (unused here, and its auth object has no `userId`) in the union. The single `if (!userId)` 401 also catches org-scoped API keys, whose `userId` is `null`. On success `c.set('userId', ...)` — handlers read `c.get('userId')!`, never `c.var.clerkAuth().userId!`, so identity always matches whichever token type actually authenticated.
- `restricted()` — takes no options; reads `c.get('userId')` (set by a preceding `authenticated()`) and 401s unless `early_access`/`internal` is set. Always resolves the flag from the owner's **live** Clerk metadata (`c.var.clerk.users.getUser(userId)`), for every token type — it no longer reads `sessionClaims`, so the check is independent of the JWT template (a per-request Clerk API call is the tradeoff). Interactive surfaces (web `isExperimental`, the VS Code extension's `hasCloudAccess`) still read the claim off the session token, so those *do* need `early_access`/`internal` in the JWT template even though the worker doesn't.
- `service()` — first-party service-to-service auth (no Clerk session): constant-time checks `SERVICE_TOKEN_HEADER` against `WORKER_SERVICE_TOKEN`. Used by `/vault/lock` and `/vault/unlock`, which billing webhooks call. Authenticates the *caller*; the subject `userId` is in the request body — treat the token as high-value.
- Routes with neither gate (e.g. `/drop`) work anonymously; if a caller *is* authenticated, `clerkAuth()` still resolves so the route can read identity opportunistically

### Drop storage — Redis (Upstash)
- `c.get('redis')` (set by the `redis()` middleware) — `@upstash/redis/cloudflare`, `Redis.fromEnv(c.env)`
- Drop details are an HSET keyed by `formatDropKey(dropId)`; no separate KV/DO needed for drop metadata
- `maxGrabbers` defaults to `1` for drops created before the field existed (lazy default in the GET handler)
- **Env var naming differs from the rest of the monorepo**: `Redis.fromEnv()` (the cloudflare adapter) only reads `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` — these are the actual deployed secret names (`wrangler secret list`). `shared/lib/redis.ts` (used by `web`/`tests`/the hydrate-test-token script) reads `REDIS_REST_URL`/`REDIS_REST_TOKEN` instead. Same Upstash instance, two different env var names depending on which client reads it — a local `worker/.dev.vars` needs the `UPSTASH_` prefixed names or `c.get('redis')` silently goes unauthenticated.

### Durable Objects — PeerServerDO
- **Not live in production** — clients signal through a separate Render-hosted PeerJS server at `peers.deadrop.io` instead (see top of this file). This is implemented and bound but parked until the DO pattern is proven out.
- Each peer gets its own Durable Object instance (actor per peer ID)
- Handles WebSocket upgrades for long-lived PeerJS signaling connections
- Class exported from `src/index.ts` as `PeerServerDO`; bound in `wrangler.toml` as `PEER_SERVER`

### Vaults — Turso
- Provisioning + lifecycle live in `shared/lib/turso/` (`createVaultUtils`) — see `shared/lib/turso/CLAUDE.md`. The former `worker/src/lib/vault.ts` was collapsed into it.
- `vault.ts` router: create/tokens layer `authenticated({ allowApiKey: true })` + `restricted()`; get is `authenticated({ allowApiKey: true })` alone; delete is `authenticated()` + `restricted()`. API keys (`DEADROP_API_KEY`) are accepted on create/tokens/get for CI/`inject`; `lock`/`unlock` are `service()`-gated for billing webhooks
- Cancel-on-billing fans out over **all** of a user's vaults via `listVaults(<hash13>)`; org-payer cancellations are a known gap (vaults are named per user, not per org)

### Billing/plans (`src/lib/billing.ts`)
- Plan limits and feature slugs are defined once in `shared/config/plans.ts`; the Worker derives `getUserPlan`/`getPlanLimits`/`hasFeature` from Clerk session claims (`pla` claim, `public_metadata.plan`) — this is the source of truth for enforcement, mirrored client-side in `web/lib/billing.ts` for UI gating only

### Typed Hono RPC
- `src/app.ts` exports `DeadropWorkerApi` type
- `client.ts` re-exports it for consumption by `shared/client.ts`
- Never import `worker/` types directly from `web/` or `cli/` — use `shared/client.ts`

## Cloudflare Config (wrangler.toml)

- Main: `src/index.ts`
- Domain: `deadrop.nieky.dev`
- DO: `PeerServerDO` class (binding `PEER_SERVER`)
- Vars: `DAILY_DROP_LIMIT=5`, `TURSO_ORGANIZATION=dallen4`
- Observability: logs + invocation logs enabled

## Path Aliases (tsconfig.json)

- `*` → `./src/*` (bare imports resolve to src/)
- `@shared/*` → `../shared/*`

## Security Constraints

- No secrets or keys stored server-side
- Only opaque identifiers: drop ID, peer ID, session nonce
- Clerk handles all authentication; never roll custom auth

## Adding New Routes

1. Create router in `src/routers/<name>.ts`
2. Register in `src/app.ts` with `app.route('/path', router)`
3. Add route constants to `src/constants.ts` (`AppRoutes`/`AppRouteParts`)
4. The `DeadropWorkerApi` type in `src/app.ts` will automatically include the new route for typed RPC
