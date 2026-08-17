---
'shared': minor
'worker': patch
---

Grant read-only vault sharing to Supporter. Sharing gates on owning a
cloud vault, not on Pro, so `vault_sharing_read` is now part of
`SUPPORTER_FEATURES` and shows on the Supporter pricing tier.
