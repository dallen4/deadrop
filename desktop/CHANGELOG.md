# desktop

## 0.4.1

### Patch Changes

- 78c16c4: Fix worker API calls failing in the desktop app. The webview origin (`tauri://localhost` in a packaged build, `http://localhost:1420` under `tauri dev`) is not in the worker's CORS allowlist, so anything the window sent to the API was blocked before it left. Requests to the API now leave from Rust through `@tauri-apps/plugin-http`, the same path Clerk already used, which sidesteps CORS instead of asking the worker to trust a desktop origin any caller could claim. This covers vault API keys, cloud vault provisioning and token issuance, and drop/grab session calls.

  Packaged builds can also opt into the webview inspector with `pnpm tauri build --features devtools`. Plain release builds still ship without it, so right-click and the inspector hotkey do nothing there.

## 0.4.0

### Minor Changes

- 0817197: Manage CI service tokens from the desktop app. Each environment in a cloud vault you own now splits into Secrets and API Keys sections: the API Keys section lists the keys already scoped to that vault and environment with their active, expired, or revoked state, and issues new ones without dropping to the CLI. A new key is shown once when it is created, since that is the only time it can be read back. A local vault, or a cloud vault shared with you, keeps the plain secrets list it had before, because neither has keys to manage.

  Adding a secret moved into a dialog behind an "Add secret" row rather than a form sitting open at the bottom of the list, and both dialogs name the vault and environment being written to so a secret cannot be added to the wrong environment by accident.

  `shared` gains the `AuthScopes` enum, previously worker-only, so any surface can name the scope it is filtering keys on.

### Patch Changes

- Updated dependencies [0817197]
  - shared@1.4.0

## 0.3.3

### Patch Changes

- b24199d: The vault page splits into a sidebar and a content pane. Environments and Credentials move to a left rail, and the environment tabs, secrets and credential controls render beside it instead of stacking underneath.

## 0.3.2

### Patch Changes

- ba4fee8: The vault page header is now the vault's name, and clicking it opens the switcher. Previously "Vault" sat as a static heading with a separate dropdown button beside it, which buried the one thing you actually want to see. The switcher marks the active vault, and still holds "New vault" and "Import vault".

## 0.3.1

### Patch Changes

- 61c2d46: Hide the vault write controls on a cloud vault someone shared with you. Adding secrets and environments, and the per-secret edit and delete actions, are replaced with a "Shared with you, read-only." note, so the app no longer offers writes that the read-only sync token would reject. Local vaults have no owner and stay writable.
- Updated dependencies [9786cb6]
  - shared@1.3.0

## 0.3.0

### Minor Changes

- 6dfbfb2: Manage vault sync credentials from the desktop app. A new Credentials tab shows the vault's current token and issues fresh ones with an explicit access level and expiry, and a break-glass rotate invalidates every token for the database at once, immediately minting and saving a replacement so your own sync keeps working. Tokens still default to read-only when no access level is given.
- 6dfbfb2: Share a cloud vault by dropping it. "Share vault" on the desktop vault page and the new `deadrop vault drop` command mint a read-only, expiring token for the environments you pick and hand it over the same peer-to-peer drop everything else uses. The recipient gets an "Add to my vaults" action on the desktop grab screen, and `deadrop grab` writes the vault into a local or global config and makes it active. Only the vault's owner can share it, and access lapses on its own when the token expires.

### Patch Changes

- Updated dependencies [6dfbfb2]
- Updated dependencies [bb15b91]
- Updated dependencies [6dfbfb2]
  - shared@1.2.0

## 0.2.3

### Patch Changes

- 4dd8c79: The desktop version is now synced from `package.json` into `tauri.conf.json`, `Cargo.toml`, and `Cargo.lock` as part of `changeset version`. Changesets only bumps `package.json`, but Tauri names every bundle from `tauri.conf.json`, so the two drifted silently: the `deadrop-desktop@0.2.2` release shipped a full set of assets named `0.1.0`, which broke checksum lookups and made the installed version impossible to identify.

  `pnpm -F desktop sync-version` writes the three files, and `--check` fails instead of writing so Desktop CI catches a bump that bypassed changesets.

## 0.2.2

### Patch Changes

- 05c080e: Bumped up the size of the navbar title, logo, nav links, and avatar for better legibility, and fixed inconsistent vertical spacing on the Drop/Grab pages so they now match Home/Vault.
- acda39a: Fixed a bug where the desktop app's vault config silently failed to save, so vaults never survived an app restart. The CLI now also falls back to the same shared vault config (in the OS app-data directory) whenever it's run outside a project with its own `.deadroprc` — so a vault created in the desktop app is immediately usable from the CLI, and vice versa, with no import step needed.
- 5fd1702: The vault page no longer silently creates a `default` vault on first visit — it now asks before setting one up. You can also import an existing vault created by the `deadrop` CLI or the VS Code extension (via its project-level `.deadroprc`) into the desktop app instead of starting from scratch.

## 0.2.1

### Patch Changes

- 40218b6: Release CI now auto-tags desktop releases on publish instead of requiring a manual `deadrop-desktop@*` tag push, and desktop CI/publish builds use prod Clerk credentials instead of placeholders.

## 0.2.0

### Minor Changes

- 84acb4f: First alpha release of the deadrop desktop app (macOS only, unsigned).
  A native window for drop, grab, and vault management: shares one Clerk
  session with the CLI via the OS keychain, a local SQLite vault with
  optional Turso cloud sync, and handshake branding. Install via
  `deadrop desktop install` or `install-desktop.sh`.

### Patch Changes

- Updated dependencies [84acb4f]
  - shared@1.1.0
