---
'cli': patch
---

Fix `deadrop inject` failing on a read-only cloud vault with "SQL write operations are forbidden". It bootstrapped the `secrets` table on every connection, which a read-only sync token rejects — so a CI run using an API key, or anyone reading a vault shared with them, could not open the replica at all. Cloud vaults already carry that table from Turso, so it is only created for local ones now.
