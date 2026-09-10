---
'desktop': patch
---

Stop the cloud sync toggle from deleting your cloud vault. Clicking "Synced" sent `DELETE /vault/:name`, which destroyed the Turso database and every token minted from it in a single click, with no confirmation. Turning sync back on then provisioned an empty database in its place.

Turning sync off is now local only. The cloud vault and its contents survive, so turning it back on reattaches to the existing database and mints a fresh credential instead of provisioning a new one. Deleting the cloud copy moved to its own item in the vault menu, behind a dialog that spells out what is destroyed and asks you to type the vault name.
