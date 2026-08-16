---
'shared': minor
'cli': patch
'worker': patch
'deadrop-vsc': patch
---

Vault sync URLs are now derived from the vault's remote name rather than stored in `.deadroprc`. Existing configs keep working with no migration, since the derived URL is identical to the one previously written. Importing a cloud vault also allocates a fresh local replica path instead of trusting the sender's, which fixes vaults imported from another machine.
