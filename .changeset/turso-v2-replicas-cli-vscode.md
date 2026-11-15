---
'cli': patch
'deadrop-vsc': patch
---

Cloud vaults open over Turso's v2 sync. A replica left over from the old v1 protocol is cleared and re-pulled instead of failing with "db file exists but metadata file does not", and a failed move to cloud sync no longer leaves metadata behind that blocks the retry.
