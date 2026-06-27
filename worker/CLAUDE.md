# CLAUDE.md — worker/

Cloudflare Worker using Hono framework. Provides the backend API: Redis-backed (Upstash) drop session storage, Turso-backed vaults, and PeerJS signaling via Durable Objects.

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
│   │   └── vault.ts          # Vault create/share (Turso-backed, restricted())
│   └── lib/
│       ├── http/core.ts      # Hono instance + custom context/middleware types
│       ├── middleware.ts     # cors, tracing, redis, authenticated(), restricted()
│       ├── billing.ts        # getUserPlan/getPlanLimits/hasFeature from Clerk claims
│       ├── messages.ts       # Message validation helpers
│       ├── durable_objects/
│       │   ├── PeerServer.ts # PeerJS signaling actor (WebSocket per peer)
│       │   ├── DropSession.ts# Drop session state DO (not active in current flow)
│       │   └── index.ts
│       ├── crypto.ts         # Validation-side crypto utilities
│       ├── vault.ts          # Turso vault provisioning (createVault, createVaultToken)
│       └── cache.ts          # Redis caching helpers
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
| `*` | `/peers/*` | PeerJS signaling — upgrades to WebSocket via `PeerServerDO` |
| GET/POST/DELETE | `/drop` | Drop session CRUD (Redis) |
| POST | `/vault` | Create a Turso vault database (`restricted()`) |
| POST | `/vault/share` | Share a vault with another user (`restricted()`) |

## Key Patterns

### Middleware Stack (applied in `src/app.ts`, in order)
1. `cors()` — origin allowlist (`deadrop.io`, Vercel preview subdomains, `vscode-webview://`); always allows `Authorization` header
2. `tracing()` — captures request IP
3. `requestId()`
4. `clerkMiddleware()` — decodes `Authorization: Bearer <token>` *or* the Clerk session cookie into `c.var.clerkAuth()`; never throws on missing/anonymous auth
5. `redis()` — attaches an Upstash client to `c.get('redis')`

### Auth gates (`src/lib/middleware.ts`)
- `authenticated()` — 401s if no `clerkAuth().userId`
- `restricted()` — 401s unless `sessionClaims.early_access` or `sessionClaims.internal` is set (Clerk publicMetadata, configured per-user in the Clerk dashboard — not in app code)
- Routes with neither gate (e.g. `/drop`) work anonymously; if a caller *is* authenticated, `clerkAuth()` still resolves so the route can read identity opportunistically

### Drop storage — Redis (Upstash)
- `c.get('redis')` (set by the `redis()` middleware) — `@upstash/redis/cloudflare`, `Redis.fromEnv(c.env)`
- Drop details are an HSET keyed by `formatDropKey(dropId)`; no separate KV/DO needed for drop metadata
- `maxGrabbers` defaults to `1` for drops created before the field existed (lazy default in the GET handler)
- **Env var naming differs from the rest of the monorepo**: `Redis.fromEnv()` (the cloudflare adapter) only reads `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` — these are the actual deployed secret names (`wrangler secret list`). `shared/lib/redis.ts` (used by `web`/`tests`/the hydrate-test-token script) reads `REDIS_REST_URL`/`REDIS_REST_TOKEN` instead. Same Upstash instance, two different env var names depending on which client reads it — a local `worker/.dev.vars` needs the `UPSTASH_` prefixed names or `c.get('redis')` silently goes unauthenticated.

### Durable Objects — PeerServerDO
- Each peer gets its own Durable Object instance (actor per peer ID)
- Handles WebSocket upgrades for long-lived PeerJS signaling connections
- Class exported from `src/index.ts` as `PeerServerDO`; bound in `wrangler.toml` as `PEER_SERVER`

### Vaults — Turso
- `src/lib/vault.ts` provisions a per-user Turso database + access token via the Turso Platform API
- Gated by `restricted()` — vaults are an early-access/internal feature, not generally available

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
