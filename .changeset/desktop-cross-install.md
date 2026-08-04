---
'cli': minor
---

Added `deadrop desktop install` to install (or update, if already
installed) the desktop app; macOS only for now. `deadrop update` now
also offers to update desktop automatically if it's already installed
(`--skip-desktop` to opt out).

The OS keychain service name used for cached credentials changed from
`deadrop-cli` to `deadrop`, shared with the new desktop app so signing
in on one signs you in on both. Existing `deadrop-cli` entries migrate
automatically and transparently on first run after upgrading.
