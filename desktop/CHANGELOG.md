# desktop

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
