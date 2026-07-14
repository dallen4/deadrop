# cli

## 1.3.1

### Patch Changes

- db51034: Fix `deadrop login` failing before the sign-in ticket reaches the CLI.
  The CLI no longer double-encodes the auth redirect URL, so the browser
  handoff completes instead of throwing an invalid-URL error. The web
  callback now surfaces token and redirect failures instead of silently
  redirecting with a bad token, and the sign-in token lifetime is widened
  to 60s to avoid spurious expiries.

## 1.3.0

### Minor Changes

- dffbf8d: Credentials are now stored in the OS keychain (macOS Keychain, Linux
  Secret Service via `libsecret`, Windows Credential Vault) instead of a
  plaintext `.deadrop/creds` file. Existing plaintext credentials are
  removed automatically on first run after upgrading, with a prompt to
  sign in again.

  Added `deadrop whoami` to check sign-in status without a full
  login/logout cycle. `deadrop login` failures now point at the actual
  platform-specific fix (libsecret on Linux, the OS keychain access
  prompt on macOS/Windows) instead of a Linux-only message.

## 1.2.0

### Minor Changes

- adbfaa9: Added a `deadrop inject -- <command>` command — runs a command with
  the active (or selected) vault's secrets injected directly into its
  environment. Secrets are decrypted in memory and never written to
  disk, replacing the export-to-`.env`-then-source pattern for local
  dev and CI/CD.

  Supports `-v/--vault`, `-e/--environment`, `-c/--config` (explicit
  config file, JSON or YAML, for CI), and `--no-override`. Forwards
  SIGINT/SIGTERM/SIGHUP to the child and exits with its exit code.

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
