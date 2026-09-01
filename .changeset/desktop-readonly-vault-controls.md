---
'desktop': patch
---

Hide the vault write controls on a cloud vault someone shared with you. Adding secrets and environments, and the per-secret edit and delete actions, are replaced with a "Shared with you, read-only." note, so the app no longer offers writes that the read-only sync token would reject. Local vaults have no owner and stay writable.
