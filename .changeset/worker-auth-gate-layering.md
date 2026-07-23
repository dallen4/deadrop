---
'worker': minor
---

Restructure vault route auth into layered `authenticated()` + `restricted()` gates: `authenticated()` owns token-type acceptance (session/OAuth always, API keys per-route via `allowApiKey`) and resolves `userId`; `restricted()` now always checks `early_access`/`internal` against the owner's live Clerk metadata. `GET /vault/:name` additionally accepts API-key tokens.
