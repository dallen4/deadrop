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
- Tauri `security.csp` is `null` (dev-open); WebRTC/PeerJS are unrestricted.
  CSP hardening is a follow-up.
- **Worker and Clerk calls leave from Rust, not the webview.**
  `src/lib/native-fetch.ts` patches `globalThis.fetch` to route anything bound
  for `VITE_DEADROP_API_URL` (plus Clerk FAPI) through
  `@tauri-apps/plugin-http`. The webview origin (`tauri://localhost`, or
  `http://localhost:1420` in dev) isn't in the worker's CORS allowlist, so
  browser-side calls never leave the window. New hosts need a matching entry in
  `src-tauri/capabilities/default.json`'s `http:default` scope.
- **Inspector in a packaged build**: `pnpm tauri build --features devtools`.
  Plain release builds compile without it, so right-click/Cmd+Opt+I do nothing.

## Vault

Local vault at `/vault`: Rust-side SQLite via the `libsql` crate
(`src-tauri/src/vault_store.rs`), optional Turso cloud sync
(`src/lib/vault-cloud.ts`), gated by `isExperimental` (`src/lib/billing.ts`).
Encryption reuses `shared/lib/secrets.ts` directly; config persisted to
`.deadroprc` (same shape as CLI/vscode-extension, but read/written via Rust
commands — `read_app_vault_config`/`write_app_vault_config` in
`src-tauri/src/config_import.rs` — not `@tauri-apps/plugin-fs`, whose
`$APPDATA/**` capability scope doesn't reliably match a file directly at
$APPDATA's root and silently no-op'd writes).

First visit to `/vault` with no config prompts "Create your vault" rather
than silently auto-bootstrapping one (`src/routes/Vault.tsx`). The CLI and
desktop app share one default vault automatically — the CLI falls back to
this same app-data-scoped config when it finds no project-scoped
`.deadroprc` (`cli/lib/global-config.ts`). Project-scoped vaults created by
the CLI/vscode-extension can also be explicitly linked in via "Import
vault" (`src/lib/vault-config.ts`'s `pickExternalVaultConfig`). Any imported
or grabbed cloud vault gets a fresh replica path (`resolveImportedVault`) —
the incoming `location` is the sender's, and means nothing here.

`Vault.tsx` splits into Environments and Credentials panes. Environments
holds the per-environment tabs; for a cloud vault you own it sections into
Secrets and API Keys accordions (`ApiKeysSection.tsx`, backed by
`src/lib/auth.ts`'s `useApiKeys` against `GET`/`POST /auth/keys`), while a
local vault or one shared with you keeps the flat secrets list. Credentials
(`src/components/vault/CredentialsTab.tsx`) issues sync tokens with an
access level + expiry and offers a break-glass rotate, both owner-gated on
`userOwnsVault` — a vault you don't own can't be reminted, so its stored
token is the only way in and must never be cleared. "Share vault"
(`ShareVaultModal.tsx`) mints a read-only token, composes the payload with
`shared/lib/vault-share.ts`, and routes it into the drop flow via router
state; the grab side adopts one through `useVault`'s `adoptVault`.

## Auth keychain backend

`src-tauri/src/keychain_store.rs` uses the `keyring` crate with all three
native-store features enabled in `Cargo.toml` (`apple-native-keyring-store`,
`windows-native-keyring-store`, `zbus-secret-service-keyring-store`) — same
credential-store semantics as the CLI's keytar on every platform (macOS
Keychain, Windows Credential Manager, Linux Secret Service via D-Bus). The
zbus backend is pure Rust, no `libdbus` system dependency needed at build
time; it still needs a running D-Bus session + Secret Service provider
(gnome-keyring/kwallet) at runtime on Linux.

## Follow-ups (not yet built)

- OAuth via `@tauri-apps/plugin-deep-link` (`deadrop://`) for packaged builds.
- `inject` / `secret` command parity with the CLI (`vault` CRUD is done via
  the in-app UI).
- CLI-driven install/update (`deadrop desktop install`, `cli/lib/update/desktop.ts`)
  now covers macOS (`hdiutil`/`ditto`/`plutil`, `/Applications`), Windows (silent
  NSIS install via `/S`, version read from the uninstall registry key — untested
  against a real Windows box, best-effort), and Linux (AppImage in `~/.local/bin`,
  version tracked via a sidecar file since AppImages don't expose it directly).
  `install-desktop.sh` mirrors macOS/Linux; no native Windows shell support yet
  (`install-desktop.ps1` is a tracked fast-follow — Windows installs go through
  the CLI for now).
- Signing — every platform ships unsigned (Gatekeeper/SmartScreen warnings).
