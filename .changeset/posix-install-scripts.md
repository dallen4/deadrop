---
'cli': patch
---

`install.sh` and `install-desktop.sh` are now POSIX sh instead of bash. Both are documented as `curl -fsSL https://deadrop.io/install.sh | sh`, but both opened with `set -euo pipefail` — and `/bin/sh` is dash on Debian and Ubuntu, which has no `pipefail`. The documented command therefore failed on line 2 with `set: Illegal option -o pipefail` on the two most common desktop Linux distributions, installing nothing. Fedora and macOS were unaffected because `/bin/sh` is bash there, which is why this went unnoticed.

`install.sh` also used two further bashisms (`&>` redirection and `[[ =~ ]]`), now replaced with POSIX equivalents. Dropping `pipefail` additionally makes the "Could not determine latest release tag" error reachable — previously a release-tag lookup that matched nothing aborted the script silently, before its own error message could print.

The Linux sandbox now runs `install.sh` under `sh` rather than `bash`, so this class of bug fails the suite instead of shipping.
