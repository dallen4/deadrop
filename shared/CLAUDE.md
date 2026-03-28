# CLAUDE.md — shared/

Core library consumed by both `web/` and `cli/`. Provides crypto primitives, XState state machines, PeerJS utilities, the typed API client factory, and all shared types/constants.

**No dev server. No deploy. No build step required during development** — both `web` and `cli` import directly from TypeScript source files. The package is compiled to `build/` only for npm publishing if needed.

## Directory Structure

```
shared/
├── types/              # TypeScript type definitions
│   ├── drop.ts         # DropContext, DropEvent, drop session types
│   ├── grab.ts         # GrabContext, GrabEvent, grab session types
│   ├── common.ts       # BaseContext, BaseHandlerInputs, file types
│   ├── peer.ts         # PeerJS type extensions
│   ├── messages.ts     # P2P protocol message types
│   ├── config.ts       # VaultStore, ConfigFile types
│   ├── db.ts           # Database schema types
│   ├── fetch.ts        # API request/response types
│   └── global.d.ts     # Global type augmentations
├── config/             # Shared configuration constants
│   ├── crypto.ts       # Crypto algorithm parameters (key sizes, algorithms)
│   ├── paths.ts        # File/folder path constants
│   └── files.ts        # File-related constants
├── lib/                # Core implementations
│   ├── machines/
│   │   ├── drop.ts     # dropMachine (XState v4), initDropContext()
│   │   └── grab.ts     # grabMachine (XState v4)
│   ├── crypto/
│   │   ├── index.ts    # getCrypto(), getSubtle(), BaseCrypto type
│   │   └── operations.ts  # ECDH key exchange, AES-256-GCM, SHA-256 helpers
│   ├── messages.ts     # P2P message serialization + validation
│   ├── secrets.ts      # Secret encryption utilities
│   ├── vault.ts        # Vault operations
│   ├── peer.ts         # PeerJS initialization helper
│   ├── data.ts         # Data transformation utilities
│   ├── constants.ts    # DropState enum, DropEventType enum, shared constants
│   └── util.ts         # General utility functions
├── tests/
│   ├── lib/            # Vitest specs (crypto.spec.ts, etc.)
│   └── mocks/          # Test mocks and fixtures (constants.ts)
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