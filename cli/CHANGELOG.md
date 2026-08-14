# cli

## 1.8.0

### Minor Changes

- 733aa0b: Added `deadrop desktop uninstall`, and an `--uninstall` flag to `install-desktop.sh`. Installing the desktop app on Linux writes to three places (the AppImage in `~/.local/bin`, a `.desktop` entry, and an icon under the hicolor theme), and nothing removed any of them — anyone who tried the app and deleted the AppImage by hand was left with a dead launcher in their application menu pointing at a missing binary.

  Both paths remove the AppImage, its version sidecar, the desktop entry, and the installed icon, then refresh the desktop and icon caches. Icons are swept across every hicolor size bucket, since the install picks its bucket from the extracted PNG's own dimensions and uninstall can't recompute it. On macOS this removes `/Applications/deadrop.app`; on Windows it points at Settings > Apps, since the NSIS installer owns its own uninstaller.

  The flag exists on the shell script as well as the CLI because installing via `curl … | sh` doesn't get you the CLI, which would have left those users with no way to undo the install.

### Patch Changes

- c96cb92: Installing the desktop app on Linux now registers it with the desktop environment. `deadrop desktop install` and `install-desktop.sh` previously placed an AppImage in `~/.local/bin` and stopped, so it never appeared in the application menu. Both now write a freedesktop `.desktop` entry and install the app icon, degrading gracefully when the icon can't be extracted or the desktop-database tools aren't present.
- 507dd22: Three Linux setup fixes found while building the Linux sandbox:
  - The keychain-unavailable message no longer hardcodes `apt-get` — it now lists the Ubuntu/Debian, Fedora/RHEL, and Arch commands, matching what `install.sh` already prints. Fedora and Arch users were being told to run a command that doesn't exist on their system.
  - Desktop AppImage selection is now architecture-aware in both `deadrop desktop install` and `install-desktop.sh`. Previously either would take the first `.AppImage` on a release regardless of arch, which would have handed x64 users an aarch64 binary as soon as a second Linux build shipped. A release with no build for your platform now says so explicitly instead of reporting "no release found".
  - `deadrop init` accepts `-y`/`--yes` and skips its `.gitignore` prompt automatically in a non-TTY shell or when `CI` is set, so it can complete unattended in Dockerfiles, CI, and provisioning scripts.

- b8fb954: `install.sh` and `install-desktop.sh` are now POSIX sh instead of bash. Both are documented as `curl -fsSL https://deadrop.io/install.sh | sh`, but both opened with `set -euo pipefail` — and `/bin/sh` is dash on Debian and Ubuntu, which has no `pipefail`. The documented command therefore failed on line 2 with `set: Illegal option -o pipefail` on the two most common desktop Linux distributions, installing nothing. Fedora and macOS were unaffected because `/bin/sh` is bash there, which is why this went unnoticed.

  `install.sh` also used two further bashisms (`&>` redirection and `[[ =~ ]]`), now replaced with POSIX equivalents. Dropping `pipefail` additionally makes the "Could not determine latest release tag" error reachable — previously a release-tag lookup that matched nothing aborted the script silently, before its own error message could print.

  The Linux sandbox now runs `install.sh` under `sh` rather than `bash`, so this class of bug fails the suite instead of shipping.

## 1.7.0

### Minor Changes

- 1f24f1c: `deadrop desktop install` (and the desktop-update prompt in `deadrop update`) now works on Windows and Linux, not just macOS — silent NSIS install on Windows, an AppImage placed in `~/.local/bin` on Linux. `install-desktop.sh` also gained Linux support; Windows still goes through the CLI for now (no native shell there).

## 1.6.0

### Minor Changes

- acda39a: Fixed a bug where the desktop app's vault config silently failed to save, so vaults never survived an app restart. The CLI now also falls back to the same shared vault config (in the OS app-data directory) whenever it's run outside a project with its own `.deadroprc` — so a vault created in the desktop app is immediately usable from the CLI, and vice versa, with no import step needed.

## 1.5.0

### Minor Changes

- 84acb4f: Added `deadrop desktop install` to install (or update, if already
  installed) the desktop app; macOS only for now. `deadrop update` now
  also offers to update desktop automatically if it's already installed
  (`--skip-desktop` to opt out).

  The OS keychain service name used for cached credentials changed from
  `deadrop-cli` to `deadrop`, shared with the new desktop app so signing
  in on one signs you in on both. Existing `deadrop-cli` entries migrate
  automatically and transparently on first run after upgrading.

### Patch Changes

- Updated dependencies [84acb4f]
  - shared@1.1.0

## 1.4.1

### Patch Changes

- 30c68e8: Fix `deadrop inject` failing with "Vault not found" on local (non-cloud) vaults. It now only mints a cloud token for cloud vaults or the config-free CI path; local vaults read directly from their SQLite file with no network call.

## 1.4.0

### Minor Changes

- 76a0da8: Add `deadrop vault env list` and `deadrop vault env add <name>` to manage per-vault environments, and `deadrop vault use --environment <env>` to switch environments while changing vaults. New vaults are now seeded with both `development` and `production` environments.

  `deadrop inject` now mints a fresh read-only vault token from the new `/vault/tokens` endpoint whenever no usable token is cached, so it works from a clean checkout. Pass `--refresh-token` to force a new token even when one is cached.

  `deadrop inject` also gains a config-free CI mode: set `DEADROP_VAULT_KEY` (the environment's decryption key) to skip config discovery entirely, selecting the vault and environment via `DEADROP_VAULT`/`DEADROP_ENVIRONMENT` (or `-v`/`-e`). In this mode it authenticates to the worker with `DEADROP_API_KEY` when no interactive session is present.

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
