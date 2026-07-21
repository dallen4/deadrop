---
'worker': minor
---

Replace `POST /vault/:name/share` with `POST /vault/tokens`, which mints a read-only Turso token for the caller's default (or named) vault and returns its hostname alongside the token. The route now also accepts API-key and OAuth machine tokens (not just Clerk session tokens), with `early_access`/`internal` access resolved from the token owner's live Clerk metadata when no session claims are present.
