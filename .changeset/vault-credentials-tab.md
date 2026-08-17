---
'worker': minor
'desktop': minor
---

Manage vault sync credentials from the desktop app. A new Credentials tab shows the vault's current token and issues fresh ones with an explicit access level and expiry, and a break-glass rotate invalidates every token for the database at once, immediately minting and saving a replacement so your own sync keeps working. Tokens still default to read-only when no access level is given.
