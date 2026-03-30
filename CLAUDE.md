# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**deadrop** is an end-to-end encrypted secret sharing platform using peer-to-peer WebRTC connections. All cryptographic operations happen client-side via the Web Crypto API — no secrets or keys ever pass through servers. Only opaque identifiers (drop ID, peer ID, session nonce) are stored server-side.

## Monorepo Structure

pnpm Workspaces with four packages:

- `shared/` — Core crypto primitives, XState state machines, PeerJS utilities, shared types. Consumed by `web` and `cli`.
- `web/` — Next.js 14 (Pages Router) PWA deployed on Vercel.
- `worker/` — Cloudflare Worker (Hono framework) providing the backend API, KV-backed drop session storage, and PeerJS signaling via Durable Objects.
- `cli/` — Node.js CLI published to npm as `deadrop`.

## Commands

```bash
# Development
pnpm start              # Start Next.js dev server (web)
pnpm -F worker dev      # Start Cloudflare Worker locally (wrangler dev)

# Build
pnpm build              # Build web (Next.js)
pnpm cli:build          # Build CLI (esbuild)
pnpm worker:deploy      # Deploy Cloudflare Worker (wrangler deploy)

# Testing
pnpm test               # Run all unit tests once (Vitest)
pnpm test:watch         # Run unit tests in watch mode
pnpm test:cov           # Run unit tests with Istanbul coverage
pnpm test:e2e           # Run Playwright e2e tests (requires running web server)

# Run tests for a specific workspace
pnpm vitest run --project web
pnpm vitest run --project cli

# Run a single test file
pnpm vitest run shared/tests/crypto.spec.ts

# Code analysis
pnpm analyze:dup        # Detect code duplication (jscpd)
pnpm analyze:unused     # Find unused TS exports (ts-prune)
```

## Architecture

### Data Flow

1. **Dropper** creates a PeerJS peer → Cloudflare Durable Object (`PeerServerDO`) handles signaling
2. Drop ID + peer ID + nonce stored in Cloudflare KV (`DROP_STORE`) via the Worker API
3. **Grabber** fetches drop metadata → WebRTC P2P connection established directly between peers
4. ECDH key exchange + AES-256-GCM encryption over WebRTC DataChannel; SHA-256 hash verifies transfer integrity

### Key Architectural Patterns

**XState State Machines** (`shared/lib/machines/`): `drop.ts` and `grab.ts` model the full workflow. The web app drives UI from machine state via `@xstate/react`; the CLI drives terminal prompts from the same machines.

**Typed Hono RPC Client**: `worker/client.ts` exports `DeadropApiClient` (typed via `hc<DeadropWorkerApi>`). This is re-exported through `shared/client.ts` so both `web` and `cli` get end-to-end type safety against the Worker API without importing directly from `worker/`.

**Cross-package path aliases**:
- `@shared/*` → `../shared/*` (in `web` and `cli` tsconfigs)
- `@config/*` → `config/*` (web only)

**Crypto layer** (`shared/lib/crypto/`): Thin wrappers around Web Crypto API. ECDH for key exchange, AES-256-GCM for encryption, SHA-256 for integrity hashing. The same crypto code runs in browsers (web) and Node.js (cli via `@roamhq/wrtc` for WebRTC).

### Web App (`web/`)

- **Pages Router** at `web/pages/` — `drop.tsx`, `grab.tsx`, auth pages, API routes, docs (MDX)
- **Component hierarchy**: `atoms/` → `molecules/` → `organisms/` (DropFlow, GrabFlow)
- **Hooks**: `use-drop.tsx`, `use-grab.tsx` drive the XState machines
- **UI**: Mantine v8 + @tabler/icons-react
- **Auth**: Clerk (`@clerk/nextjs`)
- **Error monitoring**: Sentry (edge/client/server configs in `web/`)

### Worker (`worker/`)

Hono routes:
- `/auth` — Clerk auth middleware
- `/peers` — PeerJS signaling (backed by `PeerServerDO` Durable Object)
- `/drop` — Drop session management (KV-backed)
- `/vault` — Vault management

### CLI (`cli/`)

- Commands: `drop`, `grab`, `init`, `login`, `logout`, `vault` (create/use/sync/export/import/delete), `secret` (add/remove)
- Local secrets storage: Drizzle ORM + SQLite (libsql)
- Build: esbuild → `dist/deadrop.js`; optional standalone binary via nexe

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React 18, Mantine v8, XState v4 |
| Auth | Clerk |
| P2P | PeerJS + WebRTC (browser: native, Node.js: `@roamhq/wrtc`) |
| Crypto | Web Crypto API (ECDH, AES-256-GCM, SHA-256) |
| Backend | Cloudflare Workers, Hono, Cloudflare KV + Durable Objects |
| CLI DB | Drizzle ORM + SQLite (libsql) |
| Testing | Vitest 2 + Istanbul, Playwright (11 browser configs) |
| Tooling | pnpm Workspaces, TypeScript 5.7, esbuild, Husky |

## TypeScript

Strict mode is enabled globally (`tsconfig.json`). Each workspace extends the root config with workspace-specific overrides:
- `web/`: `jsx: preserve`, path aliases `@config/*` and `@shared/*`
- `cli/`: `module: CommonJS`, Hono JSX, `@shared/*` alias
- `worker/`: `module: ES2022`, `@cloudflare/workers-types`
- `shared/`: no emit

## Code Style

Prettier config (`.prettierrc`): 70-char print width, 2-space indent, single quotes, trailing commas, semicolons. ESLint is configured for `web/` only.

## Environment Requirements

- Node.js >= 24 (see `.nvmrc`)
- pnpm >= 10

## Cross-Package Import Conventions

- `@shared/*` resolves to `../shared/*` from `web/` and `cli/`
- `@api/*` resolves to `../worker/*` from `shared/`, `web/`, and `cli/`
- `@config/*` resolves to `config/*` within `web/` only
- Never import from `worker/` directly — use `shared/client.ts` for the typed API client

## Security Constraints

- No secrets, keys, or plaintext ever leave the client
- Server-side only stores: drop ID, peer ID, session nonce (all opaque identifiers)
- All crypto operations use Web Crypto API (ECDH key exchange, AES-256-GCM encryption, SHA-256 hashing)
- CSP nonce enforced in `web/` (next-safe + `next.config.mjs`)

## Workspace-Specific Guidance

Each workspace has its own `CLAUDE.md` with package-specific context:
- `shared/CLAUDE.md` — crypto primitives, XState machines, types
- `web/CLAUDE.md` — Next.js Pages Router, Mantine UI, Playwright e2e
- `worker/CLAUDE.md` — Hono routes, Durable Objects, KV patterns
- `cli/CLAUDE.md` — Commander.js commands, Drizzle ORM, esbuild
