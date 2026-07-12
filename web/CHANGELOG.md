# web

## 1.0.1

### Patch Changes

- df322dc: Docs fixes and formatting updates: resolved an install-command
  injection issue and several broken/missing imports on the docs pages,
  refreshed FAQ/features/overview content, and documented the new
  `deadrop whoami` command and OS-keychain credential storage.

## 1.0.0

### Major Changes

- 3c4ef57: deadrop 1.0.0 — first stable platform release.

  Cloud vault subscription lifecycle: vaults are now locked (reads/writes
  blocked, tokens rotated) when a subscription is canceled and restored when
  it reactivates, driven by the Clerk billing webhook through a service-authed
  Worker endpoint. Turso provisioning + lifecycle helpers are consolidated into
  a single `shared/lib/turso` module.

### Patch Changes

- Updated dependencies [3c4ef57]
  - shared@1.0.0
