# web

## 1.0.2

### Patch Changes

- db51034: Fix `deadrop login` failing before the sign-in ticket reaches the CLI.
  The CLI no longer double-encodes the auth redirect URL, so the browser
  handoff completes instead of throwing an invalid-URL error. The web
  callback now surfaces token and redirect failures instead of silently
  redirecting with a bad token, and the sign-in token lifetime is widened
  to 60s to avoid spurious expiries.

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
