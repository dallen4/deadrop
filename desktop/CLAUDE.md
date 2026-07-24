# CLAUDE.md — desktop/

Tauri v2 desktop app (Rust shell + React 19 / Vite 7 webview). Intended to be
the "true hub" for deadrop — a **dashboard/hub for engaged users**, not a
marketing surface. The webview has native WebRTC + Web Crypto, so drop/grab run
the browser path (like `web`), not the CLI's `@roamhq/wrtc`.

## Commands

```bash
pnpm desktop:web     # vite dev only (frontend, no Rust) — fast UI iteration
pnpm desktop:dev     # tauri dev — launches the native window
pnpm desktop:build   # tauri build — bundles the app
pnpm -F desktop build      # vite build (frontend bundle only)
pnpm -F desktop typecheck  # tsc --noEmit (NON-gating; see note below)
```

## Architecture

- **Shares logic, owns its UI shell.** Drop/grab orchestration comes from the
  shared headless hooks `@shared/hooks/use-drop` + `use-grab` (platform deps
  injected via `src/contexts/DropContext.tsx` / `GrabContext.tsx`). The Mantine
  drop/grab components come from `@shared/components` (shared with `web` so the
  drop experience feels the same). `vscode` shares only the hooks, not the UI.
- **Platform adapters** (`src/lib/`): `crypto.ts` (File adapter over
  `@shared/lib/crypto`), `files.ts`, `peer.ts` (`createPeerFromConfig` + env),
  `api-headers.ts` (Clerk bearer token, opportunistic), `util.ts`
  (`generateGrabUrl` → public web origin, never `window.location`),
  `session-guard.ts` (react-router `useBlocker` + Tauri window close guard),
  `billing.ts` (`isExperimental`).
- **Routing**: `react-router-dom` (`src/router.tsx`) → `RootLayout` shell.
- **Auth**: Clerk via `@clerk/react` (SPA SDK — NOT `@clerk/nextjs`). Same Clerk
  instance as web/vscode, so JWT/claims are identical. Email/password + email
  OTP work in-webview; OAuth-via-deep-link for packaged builds is a follow-up.
- **Env**: `import.meta.env.VITE_*` (see `.env.example`), typed in
  `src/vite-env.d.ts`, accessed through `src/env.ts`.

## Conventions & gotchas

- `@shared/*` → `../shared/*`, `@api/*` → `../worker/*` (tsconfig `paths` +
  vite `resolve.alias`). Never import from `worker/` directly — use the shared
  typed client.
- The `react`/`react-dom` tsconfig `paths` pin type resolution to desktop's own
  `@types/react@19` so shared TSX (physically in `../shared`) resolves React 19
  types here instead of failing.
- **`build` is `vite build`, not `tsc && vite build`** — a full cross-package
  `tsc` pulls worker source (ambient `Env`) and pre-existing shared strictness
  warnings that fail repo-wide (web builds via `next build`, cli via esbuild for
  the same reason). `typecheck` exists for local DX but is not a build gate.
- Tauri `security.csp` is `null` (dev-open); WebRTC/PeerJS/fetch to the worker
  are unrestricted. CSP hardening is a follow-up.

## Follow-ups (not yet built)

- OAuth via `@tauri-apps/plugin-deep-link` (`deadrop://`) for packaged builds.
- Local vaults (needs libsql-WASM in the webview or Rust-side SQLite).
- `inject` / `secret` / `vault` command parity with the CLI.
- Multi-platform release bundling (`tauri-apps/tauri-action`).
