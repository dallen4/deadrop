# desktop

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
