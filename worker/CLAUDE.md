# CLAUDE.md — worker/

Cloudflare Worker using Hono framework. Provides the backend API: KV-backed drop session storage, Turso-backed vaults, and a `PeerServerDO` Durable Object for PeerJS signaling — **not yet live in production**. `wrangler.toml` only routes `deadrop.nieky.dev` to this Worker; the actual production signaling host, `peers.deadrop.io` (`NEXT_PUBLIC_PEER_SERVER_URL`/`PEER_SERVER_URL`), is a separate standalone PeerJS server on Render. `PeerServerDO` is a parked experiment — the DO pattern isn't considered production-ready yet. Don't assume it's handling real traffic just because it's implemented and bound.

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
│   │   ├── drop.ts           # Drop CRUD (KV-backed)
│   │   └── vault.ts          # Vault create/tokens/get/delete/lock/unlock (Turso via @shared/lib/turso)
│   └── lib/
│       ├── http/core.ts      # Hono instance + custom context/middleware types
│       ├── http/turn.ts      # Mints per-session TURN credentials from Cloudflare's Realtime API
│       ├── middleware.ts     # cors, tracing, authenticated(), apiKey(), service()
│       ├── billing.ts        # getUserPlan/getPlanLimits/hasFeature from Clerk claims
│       ├── messages.ts       # Message validation helpers
│       ├── durable_objects/
│       │   ├── PeerServer.ts # PeerJS signaling actor (WebSocket per peer)
│       │   ├── DropSession.ts# Drop session state DO (not active in current flow)
│       │   └── index.ts
│       ├── crypto.ts         # Validation-side crypto utilities
│       └── cache.ts          # KV caching helpers
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
| GET | `/auth/keys` | List the caller's `vault:inject` API keys for a vault + environment, filtered by scope and claims, returning `id`/`name`/`scopes`/`claims`/`expired`/`revoked` (`authenticated({ feature: API_KEYS })`). Claims are re-parsed against `VaultInjectClaimsSchema` (the same schema issuance validates, so the list and `apiKey()` verification never disagree), and a claim that fails is dropped rather than handed to a client |
| POST | `/auth/keys` | Issue a `vault:inject` API key whose claims carry the caller's resolved vault + environment (`authenticated({ feature: API_KEYS })`), refusing past the plan's `apiKeys` cap counted live from Clerk |
| `*` | `/peers/*` | PeerJS signaling via `PeerServerDO` — implemented but not live (see top of file); production uses `peers.deadrop.io` on Render |
| GET/POST/DELETE | `/drop` | Drop session CRUD (KV) |
| POST | `/vault` | Create a Turso vault database (`authenticated({ feature: CLOUD_VAULT })` — deliberately no `allowApiKey`: an API key carries no plan claims, so the cap below is unenforceable on that path), refusing past the plan's `cloudVaults` cap counted via `listVaults` |
| POST | `/vault/tokens` | Mint a Turso token for a vault — `access` defaults to `read-only`, optional `expiration` (`authenticated({ allowApiKey: true, feature: CLOUD_VAULT })`) |
| POST | `/vault/tokens/ci` | Exchange a `vault:inject` API key for a 5m read-only Turso token — vault and environment come off the key's claims, no request body (`apiKey()` alone — the required scope *is* the entitlement check) |
| POST | `/vault/rotate` | Invalidate **every** token for a vault — optional `name` in the body, same as `/vault/tokens`, so the default vault stays addressable (`authenticated({ feature: CLOUD_VAULT })`, deliberately no `allowApiKey`) |
| GET | `/vault/:name` | Get vault metadata (`authenticated({ allowApiKey: true })`) |
| DELETE | `/vault/:name` | Delete a vault (`authenticated({ feature: CLOUD_VAULT })`) |
| POST | `/vault/lock` | Lock all of a user's vaults on cancel (`service()`, `{ userId }`) |
| POST | `/vault/unlock` | Restore all of a user's vaults on reactivate (`service()`, `{ userId }`) |

## Key Patterns

### Middleware Stack (applied in `src/app.ts`, in order)
1. `cors()` — origin allowlist (`deadrop.io`, Vercel preview subdomains, `vscode-webview://`); always allows `Authorization` header
2. `tracing()` — captures request IP
3. `requestId()`
4. `clerkMiddleware()` — decodes `Authorization: Bearer <token>` *or* the Clerk session cookie into `c.var.clerkAuth()`; never throws on missing/anonymous auth

### Auth gates (`src/lib/middleware.ts`)
- **One middleware owns identity and entitlement.** `authenticated({ allowApiKey?, feature? })` resolves the caller, sets `userId`, and — when `feature` is given — gates on entitlement in the same pass. Authorization is not a separate middleware you can forget to chain, and `getAuth` is called once rather than twice. `feature` is optional because some routes authenticate without gating (`GET /vault/:name`, `GET /auth/sign-in-token`).
- Token gating: calls `getAuth(c, { acceptsToken: 'any' })` directly (not `c.var.clerkAuth()`, which defaults to session-tokens-only) and gates on `auth.tokenType` itself: 401s unless the type is `session_token`/`oauth_token`, or `api_key` with `allowApiKey: true`. Requesting `'any'` (rather than an `acceptsToken` array) is deliberate — a `TokenType[]` array doesn't type-narrow, so the return type keeps `m2m_token` in the union. That same quirk means `sessionClaims` needs a deliberate cast to read, since `m2m_token` has none. The `if (!userId)` 401 also catches org-scoped API keys, whose `userId` is `null`, and runs unconditionally — an outer `authenticated()` having already set `userId` must never let a nested one skip its own token check. Handlers read `c.get('userId')!`, never `c.var.clerkAuth().userId!`, so identity always matches whichever token type actually authenticated.
- Entitlement (`feature` set): passes when the caller's plan grants it via `hasFeature` on the session claims, or via **live** Clerk metadata (`c.var.clerk.users.getUser`) — which covers both the `early_access`/`internal` bypass *and* `publicMetadata.plan`, so a Supporter is entitled whether or not the session template projects `plan`. Pro is the one plan absent from that fallback by nature: Clerk Billing subscriptions are not public metadata, which is why `getUserPlan` reads the `pla` claim for it. An **API key short-circuits**: it could only have been issued to a caller who passed this check, and narrowing which keys reach which route is `apiKey({ scopes })`'s job, not this middleware's. Downgrades are handled by `/vault/lock`, not re-checked on every use.
- On the session path it also sets `c.set('planLimits', getPlanLimits(claims))` so handlers enforce counts without re-deriving the plan. **`planLimits` being `undefined` means unresolvable** (API key caller), not unlimited — handlers must skip the count rather than fall back to the free cap of zero, which would break every CI caller.
- `apiKey({ scopes })` routes need no `feature`: the required scope is itself the entitlement check, and `SCOPE_FEATURES` in `shared/config/plans.ts` records which feature each scope delegates.
- `service()` — first-party service-to-service auth (no Clerk session): constant-time checks `SERVICE_TOKEN_HEADER` against `WORKER_SERVICE_TOKEN`. Used by `/vault/lock` and `/vault/unlock`, which billing webhooks call. Authenticates the *caller*; the subject `userId` is in the request body — treat the token as high-value.
- Routes with neither gate (e.g. `/drop`) work anonymously; if a caller *is* authenticated, `clerkAuth()` still resolves so the route can read identity opportunistically

### Drop storage — Cloudflare KV
- `c.env.DROP_STORE` — the `DROP_STORE` binding in `wrangler.toml`; no middleware, read it off the env directly
- Drop details are one JSON value keyed by `formatDropKey(dropId)`, written with a `expirationTtl`; counters are plain numeric values
- `maxGrabbers` defaults to `1` for drops created before the field existed (lazy default in the GET handler)
- **Always pass the type argument to `get`.** `KVNamespace.get<T>(key)` type-checks as `T | null` but returns a **string** at runtime — `get<number>(key)` then makes the drop counter do `"1" + 1 === "11"`. Use `get<T>(key, 'json')` for objects/numbers and `get(key, 'text')` for strings.
- **Annotate KV call sites with an explicit return type.** `web` typechecks `worker/` (via the Hono RPC client) without `@cloudflare/workers-types`, so `KVNamespace` resolves to `unknown` there and the RPC response type collapses to `{}` — failing the Vercel build in `shared/handlers/grab.ts`. `worker/src/routers/drop.ts` and `worker/src/lib/cache.ts` carry explicit annotations for this reason; keep them.
- Out-of-worker readers (`web`'s captcha route, the e2e suites, the hydrate script) go through `shared/lib/kv.ts`, which wraps the `cloudflare` REST SDK and needs `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, and `CLOUDFLARE_KV_NAMESPACE_ID`.

### TURN credentials (`src/lib/http/turn.ts`)
- `generateTurnCredentials` calls Cloudflare's Realtime API (`rtc.live.cloudflare.com/.../generate-ice-servers`) with `TURN_KEY_ID`/`TURN_KEY_API_TOKEN` and reduces the response to a `username`/`credential` pair, TTL defaulting to 24h
- Both `POST /drop` and `GET /drop` return `turnCreds` on `DropDetails`/`InitDropResult` (`shared/types/common.ts`, `shared/types/peer.ts`) so dropper and grabber each mint their own short-lived pair — additive and backward compatible, current clients ignore the field
- No local `.dev.vars` entry exists yet, so `wrangler dev` fails on the drop routes until `TURN_KEY_ID`/`TURN_KEY_API_TOKEN` are added locally
- Server-side only so far: nothing in `web`/`cli`/`desktop` consumes `turnCreds` to build ICE server config yet (tracked as Linear DD-5, client half in progress) — signaling/relay behavior for real clients hasn't changed

### Durable Objects — PeerServerDO
- **Not live in production** — clients signal through a separate Render-hosted PeerJS server at `peers.deadrop.io` instead (see top of this file). This is implemented and bound but parked until the DO pattern is proven out.
- Each peer gets its own Durable Object instance (actor per peer ID)
- Handles WebSocket upgrades for long-lived PeerJS signaling connections
- Class exported from `src/index.ts` as `PeerServerDO`; bound in `wrangler.toml` as `PEER_SERVER`

### Vaults — Turso
- Provisioning + lifecycle live in `shared/lib/turso/` (`createVaultUtils`) — see `shared/lib/turso/CLAUDE.md`. The former `worker/src/lib/vault.ts` was collapsed into it.
- `vault.ts` router: tokens is `authenticated({ allowApiKey: true, feature: CLOUD_VAULT })`; get is `authenticated({ allowApiKey: true })` alone; create, delete and rotate are `authenticated({ feature: CLOUD_VAULT })`. API keys (`DEADROP_API_KEY`) are accepted on tokens/get for CI/`inject`, but **not** on create (unenforceable plan cap) or rotate (destructive) — both need an interactive session; `lock`/`unlock` are `service()`-gated for billing webhooks
- Cancel-on-billing fans out over **all** of a user's vaults via `listVaults(<hash13>)`; org-payer cancellations are a known gap (vaults are named per user, not per org)

### Billing/plans (`src/lib/billing.ts`)
- Plan limits, feature slugs, `AuthScopes` and the `SCOPE_FEATURES` map (a scope is a delegation of a feature) are defined once in `shared/config/plans.ts`; the Worker derives `getUserPlan`/`getPlanLimits`/`hasFeature` from Clerk session claims (`pla` claim, `public_metadata.plan`) — this is the source of truth for enforcement, mirrored client-side in `web/lib/billing.ts` for UI gating only
- Enforced today: `maxGrabbers` (`checkMaxGrabbers`), `dailyDrops` (per plan, and the anonymous per-IP counter resolves to the free tier through the same `getPlanLimits` call), `cloudVaults` (vault create), `apiKeys` (key issuance). Still unenforced: `envsPerVault`, `no_captcha`, vault sharing
- A drop refused for quota returns **429**, never 500 — a client must be able to tell a limit it cannot clear from a server fault it should retry

### Typed Hono RPC
- `src/app.ts` exports `DeadropWorkerApi` type
- `client.ts` re-exports it for consumption by `shared/client.ts`
- Never import `worker/` types directly from `web/` or `cli/` — use `shared/client.ts`

## Cloudflare Config (wrangler.toml)

- Main: `src/index.ts`
- Domain: `deadrop.nieky.dev` (production); `alpha.deadrop.nieky.dev` for `env.alpha` — CI deploys `--env alpha` on pushes to the `alpha` branch, plain `deploy` (production) on pushes to `main` (`.github/workflows/deploy_worker_workflow.yml`)
- DO: `PeerServerDO` class (binding `PEER_SERVER`) — bindings don't inherit across named environments, so `env.alpha` redeclares its own `PEER_SERVER`/`DROP_STORE` bindings; secrets likewise don't inherit and must be set separately per environment (`wrangler secret put <NAME> --env alpha`)
- Secrets: `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `TURN_KEY_ID`, `TURN_KEY_API_TOKEN`, `TURSO_PLATFORM_API_TOKEN`, `UPSTASH_REDIS_REST_TOKEN`, `UPSTASH_REDIS_REST_URL`, `WORKER_SERVICE_TOKEN` (`wrangler secret list`)
- Vars: none. Drop limits come from `PLAN_LIMITS` (`shared/config/plans.ts`) for both branches — `getPlanLimits(claims).dailyDrops` resolves anonymous callers to the free tier, so the per-IP and per-user counters share one source of truth (the Turso org slug is likewise the shared `TURSO_ORGANIZATION` constant in `shared/lib/constants.ts`, not an env var)
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
