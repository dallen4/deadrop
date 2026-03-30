# CLAUDE.md — cli/

Node.js CLI published to npm as `deadrop`. Reuses `shared/` for crypto, XState machines, and API client. Local secrets stored via Drizzle ORM + SQLite (libsql).

## Commands

```bash
pnpm build      # esbuild → dist/deadrop.js
pnpm test       # Vitest unit tests
pnpm package    # nexe standalone binary (macOS, Linux, Windows)
pnpm compile    # build + package
pnpm release    # build + npm publish
```

## Directory Structure

```
cli/
├── index.ts              # Entry point (shebang, signal handlers, bootstrap)
├── core.ts               # Commander.js CLI definition (all commands)
├── actions/              # Command handler implementations
│   ├── drop.ts           # drop command → drives dropMachine (XState)
│   ├── grab.ts           # grab command → drives grabMachine (XState)
│   ├── init.ts           # init: CLI setup wizard
│   ├── login.ts          # login: Clerk auth
│   ├── logout.ts
│   ├── vault/            # vault subcommands
│   │   ├── create.ts
│   │   ├── use.ts
│   │   ├── sync.ts       # sync vault with .env file
│   │   ├── export.ts
│   │   ├── import.ts
│   │   ├── delete.ts
│   │   └── index.ts
│   └── secret/           # secret subcommands
│       ├── add.ts
│       └── remove.ts
├── logic/
│   └── drop.ts           # Drop session workflow helpers
├── lib/
│   ├── api.ts            # createClient() with Clerk token injection
│   ├── auth/
│   │   ├── clerk.ts      # Clerk client for Node.js
│   │   └── cache.ts      # Token caching (filesystem)
│   ├── peer.ts           # PeerJS init with @roamhq/wrtc (Node.js WebRTC)
│   ├── session.ts        # Session management helpers
│   ├── crypto.ts         # CLI-specific crypto utilities
│   ├── log/
│   │   ├── index.ts      # Logger setup
│   │   ├── text.ts       # chalk text formatting
│   │   └── loader.ts     # Ora spinners
│   ├── constants.ts
│   └── util.ts           # Node.js utilities
├── db/
│   ├── init.ts           # Drizzle schema init + migrations
│   ├── vaults.ts         # Vault table schema
│   └── migrations/       # Drizzle migration files
├── scripts/
│   ├── esbuild.js        # esbuild config (bundles to dist/deadrop.js)
│   ├── prebuild.sh
│   ├── postversion.sh
│   ├── prepublish.sh
│   └── postpublish.sh
├── tests/
│   ├── unit/             # Vitest unit tests (crypto.spec.ts)
│   ├── runLocal.ts       # Local integration test helper
│   └── injectDryrun.ts   # Dry-run injection for tests
├── drizzle.config.ts
├── tsconfig.json
└── vitest.config.mts
```

## CLI Commands

```
deadrop init            # First-time setup
deadrop login           # Authenticate with Clerk
deadrop logout
deadrop drop            # Share a secret (drives dropMachine)
deadrop grab            # Receive a secret (drives grabMachine)
deadrop vault create    # Create a local vault
deadrop vault use       # Switch active vault
deadrop vault sync      # Sync vault ↔ .env file
deadrop vault export
deadrop vault import
deadrop vault delete
deadrop secret add      # Add secret to vault
deadrop secret remove
```

## Key Patterns

### XState Machines (same as web)
- `actions/drop.ts` drives `dropMachine` from `shared/lib/machines/drop.ts`
- `actions/grab.ts` drives `grabMachine` from `shared/lib/machines/grab.ts`
- Use `interpret()` + `machine.send()` to advance machine state
- Use Inquirer.js prompts for user input at each machine state transition

### API Client
- `lib/api.ts` calls `createClient()` from `shared/client.ts` with Clerk token injected
- All API calls go through the typed Hono RPC client — never use raw `fetch`

### Database (Drizzle + libsql)
- Schema defined in `db/vaults.ts`
- Migrations in `db/migrations/`
- Config: `drizzle.config.ts` (points to local SQLite via libsql)
- Initialize via `db/init.ts` at CLI startup

### WebRTC in Node.js
- `lib/peer.ts` wraps PeerJS using `@roamhq/wrtc` (native WebRTC for Node.js)
- Same PeerJS API as browser — same `shared/` code works without changes

### Logging & UX
- `lib/log/text.ts` — chalk for styled terminal output
- `lib/log/loader.ts` — Ora spinners for async operations
- Figlet for ASCII art header (Standard font bundled at build time)

## Path Aliases (tsconfig.json)

- `@shared/*` → `../shared/*`
- `@api/*` → `../worker/*`

## Build

esbuild compiles `index.ts` → `dist/deadrop.js`:
- Target: Node.js, CommonJS output
- External: native modules that can't be bundled
- nexe wraps `dist/deadrop.js` into platform-specific binaries

## TypeScript Config

- `module: CommonJS` (Node.js compatibility)
- `target: ES2020`
- Strict mode inherited from root `tsconfig.json`

## Important Constraints

- CLI reuses `shared/` for crypto, machines, and types — do not duplicate logic
- Keep `actions/` thin: orchestrate XState machine + prompt user, delegate logic to `shared/` or `logic/`
- Store auth tokens via `lib/auth/cache.ts` — never hardcode or log credentials