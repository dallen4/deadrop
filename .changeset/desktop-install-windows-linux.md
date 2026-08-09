---
'cli': minor
---

`deadrop desktop install` (and the desktop-update prompt in `deadrop update`) now works on Windows and Linux, not just macOS — silent NSIS install on Windows, an AppImage placed in `~/.local/bin` on Linux. `install-desktop.sh` also gained Linux support; Windows still goes through the CLI for now (no native shell there).
