---
'desktop': patch
---

Turning on cloud sync for a vault that already has secrets copies them into the cloud copy instead of leaving every write failing, and vault errors now show up instead of failing silently.
