# cli

## 1.1.0

### Minor Changes

- 34561ab: Added a `deadrop update` command — run it and the CLI checks for a
  newer release, downloads and verifies it, and reports the version
  change. Works whether you installed via `npm`/`pnpm`/`yarn`/`bun` or
  the standalone binary from `install.sh`.

  `install.sh` also now shows a progress bar while downloading the
  binary instead of running silently.

## 1.0.1

### Patch Changes

- af49fbb: Fix broken `drop`/`grab` in the published v1.0.0 CLI.

  TURN credentials were never baked into either compiled distribution
  (the npm package's esbuild bundle, and the standalone Bun release
  binaries), so every real install crashed on first peer connection with
  `InvalidAccessError: IceServers username cannot be null`. Both build
  scripts now require and bake `TURN_USERNAME`/`TURN_PWD` alongside the
  other platform constants.

  Also fixes the printed grab link pointing at the Worker API domain
  instead of the web app — `deadrop drop`'s grab link/QR code now
  resolves to a page a recipient can actually open.

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

## 0.3.0

### Minor Changes

- 059f4f9: Refactor to Bun binary compilation patterns
