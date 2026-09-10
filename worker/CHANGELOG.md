# worker

## 1.6.0

### Minor Changes

- 1502f27: Always give a vault a name suffix. A vault created without a name resolved to a bare `<hash13>` derived from the user id, and the ownership check requires the `<hash13>-` separator, so such a vault could never be recognised as owned by the person who created it. It rendered as read only in the desktop app, with no API keys section and no share button. An unnamed vault now resolves to `<hash13>-default`, and an empty or whitespace name resolves there too rather than silently collapsing to the bare form.

  Listing a user's vaults keeps using the bare hash as a prefix filter, which is now a separate `vaultPrefixFromUserId` so plan caps and the billing lock and unlock sweeps still see every vault a user owns.

  Existing API keys carry their resolved vault name in immutable claims, so any key issued without a name still points at the old bare database and needs reissuing.

- 1502f27: Enforce plan entitlements on the API. Feature gating folds into `authenticated({ feature })`, replacing the separate `restricted()` middleware, so identity and entitlement resolve in one pass. Early access and internal users keep their bypass, and it is now read from live Clerk metadata as well as the session claims, so entitlement no longer depends on the session template projecting the plan.

  Plan limits are enforced rather than advertised. Daily drop limits come from plan config instead of a fixed worker variable, and both the signed in and anonymous counters resolve through the same source. Creating a cloud vault or issuing an API key past the plan cap is refused with a message naming the limit, counted live from Turso and Clerk so nothing has to be reconciled locally.

  Plan limits, feature slugs and auth scopes now live in one place in shared config, and the pricing tiers page derives its copy from the same limits, so advertised numbers cannot drift from the ones actually enforced.

### Patch Changes

- 95d715c: Cap every new cloud vault at 100mb. Vaults were provisioned with no size limit, so a single vault could grow until it consumed the whole Turso storage allowance for the organisation. New databases now have Turso's own `size_limit` applied at creation, which bounds the worst case without depending on any client behaving.

  The limit is deliberately far above what a vault should ever hold. It measures the database file rather than the secrets inside it, so page allocation, the primary key index, free pages left behind by deletes, and the write ahead log history kept for replica sync all count against it. A vault whose secrets are rotated often sits at several times the size of the values it holds, and a tighter limit would refuse writes to a vault that had done nothing wrong. Per secret and per vault limits that can explain themselves belong in the client, and are tracked separately.

  Provisioning is also no longer able to leave a vault behind when it half succeeds. Applying the limit is a second call after the database is created, and if it failed the database survived uncapped while the caller saw an error. Because vaults are counted by name prefix when a plan cap is checked, that orphan still counted against its owner, which could permanently consume the single vault a Supporter is allowed. A failed limit now deletes the database it was created for before the error propagates.

- Updated dependencies [1502f27]
- Updated dependencies [95d715c]
- Updated dependencies [1502f27]
  - shared@1.5.0

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
