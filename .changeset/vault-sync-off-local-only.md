---
'deadrop-vsc': patch
'cli': patch
'desktop': patch
---

Turning cloud sync off in the VS Code extension no longer deletes the vault's Turso database. Turning it back on reattaches to the existing database, and local vaults now copy their secrets into a fresh replica instead of uploading the raw file. The CLI and desktop app share the same path.
