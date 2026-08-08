---
'desktop': patch
'cli': minor
---

Fixed a bug where the desktop app's vault config silently failed to save, so vaults never survived an app restart. The CLI now also falls back to the same shared vault config (in the OS app-data directory) whenever it's run outside a project with its own `.deadroprc` — so a vault created in the desktop app is immediately usable from the CLI, and vice versa, with no import step needed.
