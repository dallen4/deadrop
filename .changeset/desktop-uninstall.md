---
'cli': minor
---

Added `deadrop desktop uninstall`, and an `--uninstall` flag to `install-desktop.sh`. Installing the desktop app on Linux writes to three places (the AppImage in `~/.local/bin`, a `.desktop` entry, and an icon under the hicolor theme), and nothing removed any of them — anyone who tried the app and deleted the AppImage by hand was left with a dead launcher in their application menu pointing at a missing binary.

Both paths remove the AppImage, its version sidecar, the desktop entry, and the installed icon, then refresh the desktop and icon caches. Icons are swept across every hicolor size bucket, since the install picks its bucket from the extracted PNG's own dimensions and uninstall can't recompute it. On macOS this removes `/Applications/deadrop.app`; on Windows it points at Settings > Apps, since the NSIS installer owns its own uninstaller.

The flag exists on the shell script as well as the CLI because installing via `curl … | sh` doesn't get you the CLI, which would have left those users with no way to undo the install.
