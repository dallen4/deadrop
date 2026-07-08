---
'cli': minor
---

Added a `deadrop update` command — run it and the CLI checks for a
newer release, downloads and verifies it, and reports the version
change. Works whether you installed via `npm`/`pnpm`/`yarn`/`bun` or
the standalone binary from `install.sh`.

`install.sh` also now shows a progress bar while downloading the
binary instead of running silently.
