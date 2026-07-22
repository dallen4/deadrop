---
'cli': patch
---

Fix `deadrop inject` failing with "Vault not found" on local (non-cloud) vaults. It now only mints a cloud token for cloud vaults or the config-free CI path; local vaults read directly from their SQLite file with no network call.
