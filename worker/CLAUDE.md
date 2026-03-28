# CLAUDE.md — worker/

Cloudflare Worker using Hono framework. Provides the backend API, KV-backed drop session storage, and PeerJS signaling via Durable Objects.

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
│   ├── app.ts                # Hono app: all routes + DeadropWorkerApi type export
│   ├── constants.ts          # AppRoutes enum
│   ├── routers/
│   │   ├── auth.ts           # Clerk auth middleware + endpoints
│   │   ├── peers.ts          # PeerJS signaling (upgrades to WebSocket → Durable Object)
│   │   ├── drop.ts           # Drop CRUD (KV-backed)
│   │   └── vault.ts          # Vault management
│   └── lib/
│       ├── http/core.ts      # Hono instance + custom middleware types
│       ├── middleware.ts      # CORS, request ID, Clerk auth, Redis caching, tracing
│       ├── messages.ts        # Message validation helpers
│       ├── durable_objects/
│       │   ├── PeerServer.ts  # PeerJS signaling actor (WebSocket per peer)
│       │   ├── DropSession.ts # Drop session state DO (not active in current flow)
│       │   └── index.ts
│       ├── crypto.ts          # Validation-side crypto utilities
│       ├── vault.ts           # Vault business logic
│       └── cache.ts           # Redis caching layer
├── client.ts                  # Re-exports DeadropWorkerApi type (consumed by shared/client.ts)
├── types/
│   ├── global.d.ts            # Cloudflare env bindings (DROP_STORE KV, PEER_SERVER DO)
│   └── worker-configuration.d.ts
├── wrangler.toml
├── tsconfig.json
└── vitest.config.mts
```

## Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check (API metadata) |
| `*` | `/auth/*` | Clerk auth middleware + endpoints |
| `*` | `/peers/*` | PeerJS signaling — upgrades to WebSocket via `PeerServerDO` |
| GET/POST/DELETE | `/drop/*` | Drop session CRUD (Cloudflare KV) |
| GET/POST/DELETE | `/vault/*` | Vault management |

## Key Patterns

### Durable Objects — PeerServerDO
- Each peer gets its own Durable Object instance (actor per peer ID)
- Handles WebSocket upgrades for long-lived PeerJS signaling connections
- Class exported from `src/index.ts` as `PeerServerDO`
- DO must be bound in `wrangler.toml` — already configured as `PEER_SERVER`

### KV Store — DROP_STORE
- Drop session metadata stored with TTL (auto-cleanup)
- Binding defined in `wrangler.toml` as `DROP_STORE`
- Access via `c.env.DROP_STORE` in route handlers

### Typed Hono RPC
- `src/app.ts` exports `DeadropWorkerApi` type
- `client.ts` re-exports it for consumption by `shared/client.ts`
- Never import `worker/` types directly from `web/` or `cli/` — use `shared/client.ts`

### Middleware Stack (applied in `src/lib/middleware.ts`)
1. Request ID injection
2. CORS headers
3. Clerk auth (where needed)
4. Redis caching (optional)
5. Distributed tracing

## Cloudflare Config (wrangler.toml)

- Main: `src/index.ts`
- Domain: `deadrop.nieky.dev`
- KV: `DROP_STORE` namespace
- DO: `PeerServerDO` class
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
3. Add route constant to `src/constants.ts` `AppRoutes` enum
4. The `DeadropWorkerApi` type in `src/app.ts` will automatically include the new route for typed RPC