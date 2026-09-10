---
'shared': minor
'worker': patch
---

Cap every new cloud vault at 100mb. Vaults were provisioned with no size limit, so a single vault could grow until it consumed the whole Turso storage allowance for the organisation. New databases now have Turso's own `size_limit` applied at creation, which bounds the worst case without depending on any client behaving.

The limit is deliberately far above what a vault should ever hold. It measures the database file rather than the secrets inside it, so page allocation, the primary key index, free pages left behind by deletes, and the write ahead log history kept for replica sync all count against it. A vault whose secrets are rotated often sits at several times the size of the values it holds, and a tighter limit would refuse writes to a vault that had done nothing wrong. Per secret and per vault limits that can explain themselves belong in the client, and are tracked separately.

Provisioning is also no longer able to leave a vault behind when it half succeeds. Applying the limit is a second call after the database is created, and if it failed the database survived uncapped while the caller saw an error. Because vaults are counted by name prefix when a plan cap is checked, that orphan still counted against its owner, which could permanently consume the single vault a Supporter is allowed. A failed limit now deletes the database it was created for before the error propagates.
