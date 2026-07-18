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
├── index.ts        # Entry point (shebang, signal handlers, bootstrap)
├── core.ts         # Commander.js CLI definition (all commands)
├── actions/        # One handler file per command/subcommand — see "CLI Commands" below for the full list
├── logic/          # Workflow helpers kept out of actions/ (currently just drop session logic)
├── lib/
│   ├── auth/       # clerk.ts (getSessionToken(), see Key Patterns) + cache.ts (OS keychain via keytar/Bun.secrets — never plaintext) + the login OAuth loopback server
│   ├── update/     # Self-update: binary.ts (download+checksum+atomic replace) vs npm.ts (package-manager detection), shared by version.ts/download.ts/checksum.ts
│   ├── process.ts  # runWithEnv: spawns a child with injected env, forwards signals/exit code
│   ├── config.ts   # CLI config file (~/.deadrop); loadConfigFromPath for --config
│   └── ...         # crypto.ts, env.ts, files.ts, peer.ts, log/ — platform-specific I/O, see Key Patterns
├── db/             # Drizzle schema (vaults.ts) + migrations/, initialized via init.ts at startup
├── scripts/        # esbuild config + npm release lifecycle scripts
├── tests/
│   ├── e2e/        # CLI-to-CLI drop/grab e2e — also run via the tests/ workspace
│   └── unit/
├── drizzle.config.ts
├── tsconfig.json
└── vitest.config.mts
```

## CLI Commands

```
deadrop init            # First-time setup
deadrop login           # Authenticate with Clerk
deadrop logout
deadrop whoami           # Check signed-in identity
deadrop update           # Update to the latest version (npm or standalone binary)
deadrop drop            # Share a secret (drives dropMachine)
deadrop grab            # Receive a secret (drives grabMachine)
deadrop inject           # Run a command with vault secrets injected as env vars
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

### API Client & Auth
- `actions/drop.ts` and `actions/grab.ts` call `createDropHandlers`/`createGrabHandlers` (`shared/handlers/`) directly with their own `apiUri`/`apiHeaders` — they don't go through `lib/api.ts`'s singleton client
- `lib/auth/clerk.ts`'s `getSessionToken()` is the single source for fetching a fresh, server-verifiable Clerk token; returns `null` when signed out so callers degrade to anonymous requests — both `drop` and `grab` send `Authorization: Bearer <token>` when present, since the Worker can't rely on a cookie jar that doesn't exist in Node.js
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