---
'cli': patch
---

Installing the desktop app on Linux now registers it with the desktop environment. `deadrop desktop install` and `install-desktop.sh` previously placed an AppImage in `~/.local/bin` and stopped, so it never appeared in the application menu. Both now write a freedesktop `.desktop` entry and install the app icon, degrading gracefully when the icon can't be extracted or the desktop-database tools aren't present.
