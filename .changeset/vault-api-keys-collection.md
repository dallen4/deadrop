---
'worker': minor
'cli': patch
---

API keys move from `POST /auth/key` to an `/auth/keys` collection that serves both issuance and listing. `GET /auth/keys` returns the caller's `vault:inject` keys for a vault and environment, filtered by scope and by the claims the key was minted with, and returns only each key's id, name, and expired/revoked state. It resolves the vault name the same way issuance does, so a caller passes the local vault name it already knows and never has to construct the hashed cloud name itself.

`deadrop apiKeys create` follows the route to its new path. The old `/auth/key` path is gone, so a CLI older than this release cannot create keys once the worker deploys.
