# CLAUDE.md — shared/

Core library consumed by `web/`, `cli/`, and `vscode-extension/`. Provides crypto primitives, XState state machines, PeerJS utilities, the typed API client factory, drop/grab handler factories, billing/plan config, and all shared types/constants.

**No dev server. No deploy. No build step required during development** — both `web` and `cli` import directly from TypeScript source files. The package is compiled to `build/` only for npm publishing if needed.

## Directory Structure

```
shared/
├── types/              # drop/grab/peer/message/config/db/fetch types — one file per domain
├── config/             # crypto params, paths, file constants, plus:
│   ├── plans.ts        # PLAN_SLUGS/FEATURE_SLUGS/PLAN_LIMITS — billing source of truth
│   └── tiers.ts        # Pricing-page tier copy (web-facing only, not enforcement)
├── handlers/           # createDropHandlers()/createGrabHandlers() — see Handler Factories below
├── lib/
│   ├── machines/       # dropMachine/grabMachine (XState v4) — see XState Machines below
│   ├── crypto/         # getCrypto()/getSubtle() + ECDH/AES-256-GCM/SHA-256 ops — see Crypto below
│   ├── turso/          # Turso vault provisioning/lifecycle — own CLAUDE.md, read it before touching
│   └── ...             # messages, secrets, vault, redis, peer, data, fetch, constants, util
├── db/                 # Drizzle schema shared between cli (libsql) and worker (vault provisioning)
├── tests/lib/ + mocks/ # Vitest specs + fixtures; tests/http.ts has the e2e test-bypass constants
├── scripts/hydrate-test-token.ts  # Seeds the stable e2e DROP_TEST_TOKEN into Redis
├── client.ts           # createClient() + DeadropApiClient type
└── tsconfig.json
```

## Key Exports

### `shared/client.ts`
```ts
import { createClient, DeadropApiClient } from '@shared/client'
// createClient(baseUrl: string) → typed Hono RPC client
```

### `shared/lib/machines/drop.ts`
```ts
import { dropMachine, initDropContext } from '@shared/lib/machines/drop'
// XState v4 machine for the full drop workflow
```

### `shared/lib/machines/grab.ts`
```ts
import { grabMachine } from '@shared/lib/machines/grab'
// XState v4 machine for the full grab workflow
```

### `shared/lib/crypto/index.ts`
```ts
import { getCrypto, getSubtle } from '@shared/lib/crypto'
// getCrypto() → Web Crypto API (browser or Node.js)
// getSubtle() → SubtleCrypto interface
```

### `shared/lib/constants.ts`
```ts
import { DropState, DropEventType } from '@shared/lib/constants'
// Canonical enums used by both machines and consumers
```

## Crypto Layer

All crypto uses Web Crypto API (same code in browser and Node.js):
- **ECDH** — key exchange between dropper and grabber
- **AES-256-GCM** — symmetric encryption of the secret payload
- **SHA-256** — integrity hash to verify transfer

`getCrypto()` abstracts `window.crypto` vs `globalThis.crypto` so code runs in both environments. In CLI, Node.js v24's built-in `globalThis.crypto` is used (no polyfill needed).

Do not use third-party crypto libraries — always go through `shared/lib/crypto/`.

## XState Machines

Both machines use XState v4 (not v5):
- States and events are typed via `shared/types/drop.ts` and `shared/types/grab.ts`
- `initDropContext()` constructs the initial `DropContext`
- Consumers (`web/hooks/use-drop.tsx`, `cli/actions/drop.ts`) interpret the machine and drive it with `.send(event)`
- Never add UI or platform-specific logic to the machines — they must stay portable

## Handler Factories (`shared/handlers/`)

`createDropHandlers`/`createGrabHandlers` own *all* session orchestration (peer init, key exchange, message send/receive, machine event dispatch) and build a Hono client from `apiUri`/`apiHeaders`. Both `web/hooks/use-drop.tsx`/`use-grab.tsx` and `cli/actions/drop.ts`/`grab.ts` are thin adapters that supply platform-specific I/O (logger, file encrypt/decrypt, `initPeer`, `apiHeaders`) and otherwise just call `init()`. Never duplicate this orchestration logic in `web/` or `cli/` — extend the handler factory instead.

**Multidrop**: `createDropHandlers` tracks each grabber independently in `ctx.grabbers` (a `Map<grabberId, Grabber>`), each with its own `GrabberStatus` (`connected` → `transferring` → `confirmed`/`failed`) and retry timers scoped per grabber, so one slow/failed grabber never blocks or corrupts another's handshake. The dropper accepts grabbers up to `maxGrabbers` (server-enforced in `worker/src/lib/billing.ts`'s `checkMaxGrabbers`, plan cap with an `early_access`/`internal` bypass) and the session completes/cleans up once every grabber reaches a terminal status.

`apiHeaders` on `BaseHandlerInputs` (`shared/types/common.ts`) accepts either a plain object or a `() => Record<string,string> | Promise<Record<string,string>>` — the function form exists because web's Clerk token has to be fetched fresh per request (`useApiHeaders()`).

## Billing/Plans (`shared/config/plans.ts`, `shared/config/tiers.ts`)

Plan limits, feature slugs, and Stripe/Clerk plan-slug mapping live here once — `worker/src/lib/billing.ts` is the enforcement source of truth (reads Clerk session claims), `web/lib/billing.ts` mirrors it for UI gating only. `tiers.ts` is presentation-only copy for the pricing page; it does not gate anything.

## Path Aliases (tsconfig.json)

- `@api/*` → `../worker/*` (for accessing worker types from shared)

## Adding to shared/

- **New types**: Add to appropriate file in `types/` or create a new one
- **New constants**: Add to `lib/constants.ts` or `config/`
- **New crypto operation**: Add to `lib/crypto/operations.ts`, export via `lib/crypto/index.ts`
- **New utility**: Add to `lib/util.ts` (general) or `lib/data.ts` (data transforms)
- **Tests**: Add to `tests/lib/<name>.spec.ts`

## Testing

```bash
pnpm vitest run shared/tests/     # Run all shared tests
pnpm vitest run shared/tests/lib/crypto.spec.ts  # Single file
```

Tests use Vitest 2 with fixtures in `tests/mocks/constants.ts`.

## Important Constraints

- No browser-only or Node.js-only APIs at the top level
- Use `getCrypto()` / `getSubtle()` for all Web Crypto access
- Keep machines free of side effects beyond XState's action/service model
- This package has no build step during development — changes are immediately reflected in web and cli