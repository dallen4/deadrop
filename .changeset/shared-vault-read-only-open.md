---
'deadrop-vsc': patch
'desktop': patch
'cli': patch
---

Opening a vault someone shared with you no longer sends a schema write that a read-only token refuses. The secrets table is only created when it's missing.
