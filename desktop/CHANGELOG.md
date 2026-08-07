# desktop

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
