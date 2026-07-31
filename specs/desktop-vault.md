# Desktop Vault Spec

## Goal

Replace the desktop homepage's "Coming soon" vault badge with a working,
Mantine-styled, native in-app vault: create/switch between multiple local
vaults, manage environments, add/edit/rename/delete secrets, and optionally
enable cloud sync (Turso-backed, gated to early-access users, same as
today's web/CLI/vscode-extension model).

## Current State

Three platforms already implement vaults, in three different ways:

- **CLI** (`cli/lib/`, `cli/db/`, `cli/actions/vault/*`): Node.js process,
  `@libsql/client` + Drizzle ORM directly against a local SQLite file
  (`.deadroprc`-configured), optional Turso embedded-replica cloud sync.
- **vscode-extension**: same DB approach as CLI (`vscode-extension/src/lib/vault.ts`,
  Node extension host), but with a full Mantine-free React webview UI
  (`views/src/organisms/VaultApp.tsx` + molecules: `VaultCreate`,
  `CloudSyncButton`, `EnvSidebar`, `SecretRow`, `AddSecretForm`) driven by
  a `postMessage` protocol (`VaultExtensionMessageType`/`VaultWebviewMessageType`
  in `src/types.ts`). Cloud sync gating: `hasCloudAccess()`
  (`src/auth/clerk.ts`) decodes the Clerk session JWT client-side and checks
  `early_access`/`internal` claims.
- **web**: browser-only, via a Service Worker doing OPFS-backed SQLite —
  not reusable in a Tauri webview (confirmed not viable for desktop, see
  prior discussion in this session).
- **Desktop**: nothing yet — no route, no DB access of any kind.

**What's already isomorphic and directly reusable in desktop's webview, no
Rust involved:**
- `shared/lib/secrets.ts` (`wrapSecret`/`unwrapSecret`) — Web Crypto
  (AES-256-GCM) based. Encrypts/decrypts secret *values* client-side; the
  DB layer (wherever it lives) only ever stores/returns opaque encrypted
  strings, never plaintext.
- `shared/lib/vault.ts` (`initEnvKey`, `vault()`, `initConfig()`) — also
  Web Crypto based. `initConfig()` is literally the "bootstrap a `default`
  vault" pattern used by `cli/actions/init.ts` and referenced by the user
  as the pattern to follow for desktop's multi-vault default.
- `shared/types/config.ts` (`DeadropConfig`, `VaultDBConfig`,
  `VaultEnvironments`, `CloudVaultConfig`, `ActiveVaultConfig`) — the config
  shape, reused as-is.
- Cloud vault provisioning (`POST /vault` on the Worker) — a plain HTTPS
  call through the existing typed Hono RPC client (`@shared/client`), same
  as `cli/actions/vault/create.ts`'s `provisionCloudVault`. Desktop already
  has `tauri-plugin-http` installed (for the Clerk auth work), which routes
  webview `fetch` calls through Rust — no new networking plumbing needed.
- Cloud-sync gating — desktop already has `isExperimental(claims)`
  (`desktop/src/lib/billing.ts`), the same `early_access`/`internal`
  Clerk-claims check as vscode's `hasCloudAccess()`, already proven via the
  existing multidrop gating. `@clerk/react`'s `useAuth()` exposes
  `sessionClaims` directly — no manual JWT decoding needed (nicer than
  vscode's approach).

**What genuinely needs new Rust code:** local SQLite read/write. Web Crypto
covers encryption; nothing covers "execute SQL against a file on disk" from
a webview. This mirrors exactly the shape of the auth work we just shipped
(a native capability the webview can't do itself, bridged via Rust) — see
`specs/desktop-shared-keychain-auth.md` for the precedent.

**Crate choice:** the official `libsql` Rust crate (v0.9.x, `remote` +
`replication` features) supports the same local-file + Turso-embedded-replica
sync model as the Node `@libsql/client`. The community `tauri-plugin-libsql`
(v0.1.0) does not yet expose those features (only `core`/`encryption` by
default) — skip it and depend on `libsql` directly, writing our own thin
Tauri commands, the same pattern as `keychain_store.rs`.

## Proposed Architecture

### Rust layer (`desktop/src-tauri/src/vault_store.rs`)

A new module, structured like `keychain_store.rs`: no framework, just
`libsql` calls wrapped in Tauri commands.

```rust
#[tauri::command]
async fn vault_ensure_schema(config: VaultDbConfigDto) -> Result<(), String>;
#[tauri::command]
async fn vault_list_secret_names(config: VaultDbConfigDto) -> Result<Vec<SecretNameDto>, String>;
#[tauri::command]
async fn vault_get_encrypted_secret(config: VaultDbConfigDto, name: String, environment: String) -> Result<Option<String>, String>;
#[tauri::command]
async fn vault_add_secret(config: VaultDbConfigDto, name: String, environment: String, encrypted_value: String) -> Result<(), String>;
#[tauri::command]
async fn vault_update_secret(config: VaultDbConfigDto, name: String, environment: String, encrypted_value: String) -> Result<(), String>;
#[tauri::command]
async fn vault_rename_secret(config: VaultDbConfigDto, old_name: String, new_name: String, environment: String) -> Result<(), String>;
#[tauri::command]
async fn vault_delete_secret(config: VaultDbConfigDto, name: String, environment: Option<String>) -> Result<(), String>;
```

`VaultDbConfigDto` mirrors `VaultDBConfig` (`{ location, cloud?: { syncUrl, authToken? } }`
— `environments` isn't needed Rust-side, since encryption happens in TS).
Every command opens a `libsql::Database` for the given `location`
(local file path under the Tauri app data dir), with `sync_url`/`auth_token`
set when `cloud` is present; after any write, call `.sync()` if cloud is
configured (mirrors `syncWithRetry` — port the same retry-on-`PrimaryHandshakeTimeout`/`Unavailable`
logic from `shared/db/init.ts`). Schema is one `CREATE TABLE IF NOT EXISTS
secrets (name TEXT NOT NULL, value TEXT NOT NULL, environment TEXT NOT NULL,
PRIMARY KEY (name, environment))` — no ORM, plain SQL, matching
`ensureSecretsSchema`.

Opening a fresh `libsql::Database` per command (rather than holding a
long-lived connection pool in Tauri state) keeps this simple and matches
vscode's `openDB`/`run()` pattern (`vscode-extension/src/lib/vault.ts`) —
open, do the operation, close. Revisit only if this proves too slow in
practice (SQLite opens are cheap).

### Config persistence (`.deadroprc`, matching CLI/vscode-extension)

`DeadropConfig` (`{ active_vault, vaults }`, including each vault's
`environments` map of **plaintext** base64 AES keys — see the flagged
security note below) persists as a `.deadroprc` YAML file — the same
pattern and file name CLI (`cli/lib/config.ts`) and vscode-extension
(`vscode-extension/src/lib/config.ts`) already use (`yaml`'s
`stringify`/`parse`), not a JSON store. Only the root directory differs:
CLI/vscode-extension resolve `.deadroprc` against a workspace root/cwd,
which desktop doesn't have, so it lives at the root of Tauri's app data dir
instead. Read/write via `@tauri-apps/plugin-fs`'s `readTextFile`/
`writeTextFile`/`exists`/`mkdir` with `BaseDirectory.AppData`, directly from
the webview — no Rust commands needed, same reasoning as before (no reason
to add a Rust detour for plain text I/O).

**Security note (flagged, not silently decided):** matching the existing
CLI/vscode-extension pattern, per-environment AES-256-GCM keys are stored
in plaintext in this config file, not the OS keychain. Only secret
*values* are encrypted. This is a conscious "match existing platform
behavior" choice, not an oversight — revisit only if asked.

### Encryption & config building (webview, TypeScript — no Rust)

Reused directly from `shared/`:
- `initConfig()` / `vault()` / `initEnvKey()` (`shared/lib/vault.ts`) —
  bootstrap a new vault + its `development`/`production` environment keys.
- `wrapSecret(key, value)` / `unwrapSecret(key, wrappedValue)`
  (`shared/lib/secrets.ts`) — encrypt before calling `vault_add_secret`/
  `vault_update_secret`; decrypt after `vault_get_encrypted_secret`.

### Cloud sync provisioning (webview, TypeScript — no Rust)

`desktop/src/lib/vault-cloud.ts` (new, thin): mirrors
`cli/actions/vault/create.ts`'s `provisionCloudVault` — `POST /vault` via
`@shared/client`'s typed Hono client with the Clerk session token as
`Authorization` header (reuse `desktop/src/lib/api-headers.ts`, already
used by drop/grab), routed through `tauri-plugin-http` automatically since
the plugin patches global `fetch`. Enabling cloud sync: provision via this
endpoint, then persist the returned `CloudVaultConfig` onto the active
vault's config and re-run `vault_ensure_schema` (which will now sync).
Disabling: call `DELETE /vault/:name`, clear `cloud` from the local config
(local file keeps working, just stops syncing).

### Gating

`useAuth().sessionClaims` (`@clerk/react`) → `isExperimental(claims)`
(`desktop/src/lib/billing.ts`, already exists). Cloud-sync UI is
shown-but-disabled (not hidden) with a tooltip when `false`, matching
vscode's `CloudSyncButton`'s `canCloudSync`/`onLocked` pattern
("Cloud sync is a premium feature...").

## Multi-Vault & Default Vault

Mirrors `cli/actions/init.ts` + `shared/lib/vault.ts`'s `initConfig()`
exactly: first time the desktop Vault page loads with no config present,
auto-bootstrap one vault named `default` (via `initConfig()`, unchanged)
and set it active — no manual "create your first vault" friction. From
there, the UI supports creating additional named vaults and switching
between them (`active_vault.name` in `DeadropConfig`), matching vscode's
`vaults: { name: VaultDBConfig }` shape. Vault DB files live at
`<Tauri app data dir>/vaults/<name>.db`.

## UI (Mantine, new — `desktop/src/routes/Vault.tsx` + components)

Restyled in Mantine per the user's explicit direction (not a port of
vscode's raw-CSS `VaultApp.tsx`), but following its structural/logic
patterns:
- **Vault switcher** (top of page or in a `Menu`): lists vaults from
  `DeadropConfig.vaults`, switch sets `active_vault`, "+ New vault" opens
  a create form (name input, optional "enable cloud sync" checkbox –
  disabled/tooltipped per gating).
- **Environment sidebar** (`Tabs` or a simple list, mirrors `EnvSidebar`):
  environments for the active vault, `+` to add a new one (generates a
  fresh key via `initEnvKey()`, no cloud DB implication per
  `shared/lib/turso/CLAUDE.md` — "Environments are local-only").
- **Secret list** (mirrors `SecretRow`): name, reveal/hide (auto-hide after
  15s, matching vscode's existing UX), copy to clipboard, inline rename,
  inline edit, delete — each backed by `unwrapSecret`/`wrapSecret` +
  the corresponding Rust command.
- **Add-secret form** (mirrors `AddSecretForm`): name + value inputs.
- **Cloud sync toggle** (mirrors `CloudSyncButton`): on/off switch,
  disabled+tooltip when `!isExperimental`, loading state while
  provisioning/tearing down.

Route: `/vault`, added to `desktop/src/router.tsx`. Homepage's Vault card
(`desktop/src/routes/Home.tsx`) becomes a real `ActionCard` link to `/vault`,
dropping the `Badge`/"Coming soon".

## Error Handling

- **Rust command failures** (SQLite open/write error, sync failure after
  retries exhausted): surfaced as a rejected promise from `invoke()`;
  webview shows a Mantine notification, matching `showNotification`
  patterns already used elsewhere in this codebase.
- **Cloud sync provisioning failure** (network error, `restricted()` 403 if
  claims are stale): notification + cloud toggle reverts to off.
- **Corrupt/missing config file**: treated as "no config" → re-run the
  `default` vault bootstrap (self-healing, same spirit as the auth work's
  keychain migration).

## Out of Scope

- Migrating an existing CLI-created local vault into desktop (or vice
  versa) — no shared vault-file location between CLI and desktop in this
  iteration; each platform has its own `<app data dir>/vaults/`.
- `vault export`/`import` (CLI-only for now).
- Upgrading environment-key storage to the OS keychain (flagged above,
  deliberately deferred).
- Web's OPFS-based approach — not applicable to Tauri, not revisited here.

## Verification

1. `cargo check`/`cargo build` on `desktop/src-tauri` after adding `libsql`
   and `vault_store.rs`.
2. Fresh app launch (no config) → visiting `/vault` auto-bootstraps a
   `default` vault, `development`/`production` environments visible.
3. Add/edit/rename/delete a secret in `development` → persists across app
   restart (re-open `/vault`, secret still there, still decrypts correctly).
4. Create a second named vault, switch between the two — each has its own
   independent secret list.
5. Cloud sync toggle: hidden/disabled-with-tooltip for a non-early-access
   signed-in user; for an early-access user, enabling provisions a Turso
   DB (`POST /vault` succeeds, `CreateVaultResponse` persisted), a write
   made locally shows up if the vault DB is inspected via the Turso
   dashboard (or at minimum, `.sync()` doesn't error).
6. Disable cloud sync → `DELETE /vault/:name` succeeds, local vault keeps
   working read/write without the cloud config.
7. Kill the app mid-write (simulate) → next launch doesn't corrupt the
   config file or the SQLite file (SQLite's own durability covers the DB;
   `writeTextFile` is a single full-file write, same non-atomic exposure
   CLI/vscode-extension's `.deadroprc` writes already accept today — not a
   new risk introduced here).
