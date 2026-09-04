---
'cli': minor
---

`deadrop init --global` initializes deadrop in your OS app-data directory rather than the current one. That is the config the CLI falls back to when a project has no `.deadroprc` of its own, and the same one the desktop app uses — until now it could only be created by the desktop app or by grabbing a shared vault.
