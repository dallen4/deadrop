# worker

## 1.5.0

### Minor Changes

- 0817197: API keys move from `POST /auth/key` to an `/auth/keys` collection that serves both issuance and listing. `GET /auth/keys` returns the caller's `vault:inject` keys for a vault and environment, filtered by scope and by the claims the key was minted with, and returns only each key's id, name, and expired/revoked state. It resolves the vault name the same way issuance does, so a caller passes the local vault name it already knows and never has to construct the hashed cloud name itself.

  `deadrop apiKeys create` follows the route to its new path. The old `/auth/key` path is gone, so a CLI older than this release cannot create keys once the worker deploys.

### Patch Changes

- 0817197: Signed-in droppers count against their own account rather than their IP address. Previously everyone behind one address shared a single daily allowance, so colleagues on an office network or a VPN could exhaust each other's drops. Anonymous drops are still counted per IP.
- Updated dependencies [0817197]
  - shared@1.4.0

## 1.4.0

### Minor Changes

- f1fab50: Issue and accept scoped API keys for CI vault access. `POST /auth/key` mints a Clerk API key carrying a `vault:inject` scope and the caller's resolved vault and environment as claims, and `POST /vault/tokens/ci` exchanges one for a short-lived read-only Turso token. A new `apiKey()` middleware verifies the key, validates its claims against the schema registered for each scope, and refuses to be constructed with an empty scope list so a misconfigured route cannot authorize every key.

  Both new routes sit behind `restricted()`, and API key failures now distinguish a bad credential from an unreachable Clerk: a 4xx or a missing key returns 401, while an outage or network error returns 503 rather than telling a pipeline to rotate a working key.

### Patch Changes

- Updated dependencies [9786cb6]
  - shared@1.3.0

## 1.3.0

### Minor Changes

- 6dfbfb2: Manage vault sync credentials from the desktop app. A new Credentials tab shows the vault's current token and issues fresh ones with an explicit access level and expiry, and a break-glass rotate invalidates every token for the database at once, immediately minting and saving a replacement so your own sync keeps working. Tokens still default to read-only when no access level is given.

### Patch Changes

- 6dfbfb2: Vault sync URLs are now derived from the vault's remote name rather than stored in `.deadroprc`. Existing configs keep working with no migration, since the derived URL is identical to the one previously written. Importing a cloud vault also allocates a fresh local replica path instead of trusting the sender's, which fixes vaults imported from another machine.
- bb15b91: Grant read-only vault sharing to Supporter. Sharing gates on owning a
  cloud vault, not on Pro, so `vault_sharing_read` is now part of
  `SUPPORTER_FEATURES` and shows on the Supporter pricing tier.
- Updated dependencies [6dfbfb2]
- Updated dependencies [bb15b91]
- Updated dependencies [6dfbfb2]
  - shared@1.2.0

## 1.2.1

### Patch Changes

- Updated dependencies [84acb4f]
  - shared@1.1.0

## 1.2.0

### Minor Changes

- 1d5324d: Restructure vault route auth into layered `authenticated()` + `restricted()` gates: `authenticated()` owns token-type acceptance (session/OAuth always, API keys per-route via `allowApiKey`) and resolves `userId`; `restricted()` now always checks `early_access`/`internal` against the owner's live Clerk metadata. `GET /vault/:name` additionally accepts API-key tokens.

## 1.1.0

### Minor Changes

- 76a0da8: Replace `POST /vault/:name/share` with `POST /vault/tokens`, which mints a read-only Turso token for the caller's default (or named) vault and returns its hostname alongside the token. The route now also accepts API-key and OAuth machine tokens (not just Clerk session tokens), with `early_access`/`internal` access resolved from the token owner's live Clerk metadata when no session claims are present.

## 1.0.2

### Patch Changes

- 0db9c4e: Fix the worker rejecting valid Clerk session tokens with 401 (which broke
  CLI/web sign-in at `/auth/token`). Clerk now issues v2-format session
  tokens, and the worker's `@clerk/backend` was pinned to v2 by the
  deprecated `@hono/clerk-auth`. Migrated to `@clerk/hono`, which pulls
  `@clerk/backend@3.x` and validates v2 tokens. Context API is unchanged
  (`c.var.clerkAuth()`, `c.get('clerk')`, `getAuth(c)`).

## 1.0.1

### Patch Changes

- db51034: Fix `deadrop login` failing before the sign-in ticket reaches the CLI.
  The CLI no longer double-encodes the auth redirect URL, so the browser
  handoff completes instead of throwing an invalid-URL error. The web
  callback now surfaces token and redirect failures instead of silently
  redirecting with a bad token, and the sign-in token lifetime is widened
  to 60s to avoid spurious expiries.

## 1.0.0

### Major Changes

- 3c4ef57: deadrop 1.0.0 — first stable platform release.

  Cloud vault subscription lifecycle: vaults are now locked (reads/writes
  blocked, tokens rotated) when a subscription is canceled and restored when
  it reactivates, driven by the Clerk billing webhook through a service-authed
  Worker endpoint. Turso provisioning + lifecycle helpers are consolidated into
  a single `shared/lib/turso` module.

### Patch Changes

- Updated dependencies [3c4ef57]
  - shared@1.0.0
