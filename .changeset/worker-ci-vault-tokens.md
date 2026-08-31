---
'worker': minor
---

Issue and accept scoped API keys for CI vault access. `POST /auth/key` mints a Clerk API key carrying a `vault:inject` scope and the caller's resolved vault and environment as claims, and `POST /vault/tokens/ci` exchanges one for a short-lived read-only Turso token. A new `apiKey()` middleware verifies the key, validates its claims against the schema registered for each scope, and refuses to be constructed with an empty scope list so a misconfigured route cannot authorize every key.

Both new routes sit behind `restricted()`, and API key failures now distinguish a bad credential from an unreachable Clerk: a 4xx or a missing key returns 401, while an outage or network error returns 503 rather than telling a pipeline to rotate a working key.
