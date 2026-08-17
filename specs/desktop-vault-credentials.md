# Vault credentials tab (desktop)

A `Credentials` tab on the desktop `/vault` page for viewing, issuing, and
invalidating the Turso auth tokens behind a cloud-synced vault. Visible only
for vaults the signed-in user owns.

## Status

**Shipped** in [#153](https://github.com/dallen4/deadrop/pull/153).

## Motivation

Cloud vault tokens today are invisible and permanent:

- `provisionCloudVault` (`desktop/src/lib/vault-cloud.ts`) mints one
  full-access token at vault creation and writes it to `.deadroprc` in
  plaintext (`CloudVaultConfig.authToken`, `shared/types/config.ts`).
- `createVaultToken` (`shared/lib/turso/provision.ts`) never passes an
  expiration, and the Turso default is `never`. Every vault token deadrop
  has issued so far is immortal.
- There is no surface anywhere (desktop, web, CLI, vscode) to see, replace,
  or revoke that token.

The goal is a surface that makes the credential visible, makes new ones
bounded by default, and gives the user a way out when one leaks.

## Turso API constraints

These are hard limits from the platform API and they shape everything below.
Verified against `docs.turso.tech/llms.txt`; there are exactly two
database-token endpoints.

| Operation | Endpoint | Notes |
|---|---|---|
| Mint | `POST /v1/organizations/{org}/databases/{db}/auth/tokens` | Takes `expiration` (default `never`) and `authorization` (`full-access` \| `read-only`) |
| Invalidate | `POST /v1/organizations/{org}/databases/{db}/auth/rotate` | "Invalidates **all** authorization tokens for the specified database" |

Consequences:

1. **No list endpoint.** Tokens are stateless JWTs signed with a
   per-database key. The platform cannot enumerate them.
2. **No single-token revoke.** Rotation swaps the signing key, so it kills
   every token for that database at once, including the one this app and
   the CLI are currently syncing with.
3. **Access level and expiry are fixed at mint.** Neither can be changed
   afterward, so in the UI they are immutable row metadata, never controls.

Because of (1), a per-token list requires the *worker* to keep its own
registry at mint time. Even with a registry, (2) still means rows cannot
offer individual revoke.

## Ownership gating

`userOwnsVault(userId, vaultName)` already exists at
`shared/lib/turso/index.ts:40` and is currently dead code. It sha256-hashes
the Clerk `userId`, takes the first 13 hex chars, and checks
`vaultName.startsWith(`${userIndex}-`)`.

The tab calls it with `activeVault.cloud.name`, which
`provisionCloudVault` already stores in its prefixed remote form. Three
states:

- No `cloud` config: "This vault is local only."
- Has `cloud`, ownership check fails: the current-token row only, no issue
  or rotate controls (see below).
- Has `cloud`, ownership passes: the full tab.

The non-owned case is reachable today via desktop's "Import vault"
(`pickExternalVaultConfig`), and becomes common once `vault_sharing_read` /
`vault_sharing_write` ship.

**For a non-owned vault the stored `authToken` is irreplaceable.** Both
`POST /vault` and `POST /vault/tokens` derive the vault name from the
caller's own `userId`, so a user cannot mint a token for someone else's
database. The tab must therefore:

- never offer issue or rotate for a vault the user does not own
- treat the stored token as precious: no "clear token" affordance, and a
  warning that if the owner rotates, access is lost until they send a new
  token out of band

This is also why `authToken` has to stay in persisted config rather than
being minted on open. See `specs/vault-config-derive-sync-url.md`.

This is a UI affordance, not a security boundary. Every worker vault route
already derives `vaultName` from the caller's own `userId`
(`vaultNameFromUserId`), so a user cannot address someone else's vault
regardless of what the client sends.

## Decision: no token registry

**deadrop does not mirror state that Turso or Clerk already owns.** No
worker-side record of how many tokens exist for a database, no local copy
of a user's Clerk API keys. Upstream is the source of truth; duplicating it
buys a nicer list in exchange for a second copy that goes stale, needs its
own lifecycle, and becomes another place a credential can leak from.

Applied here: the tab shows the token currently in `.deadroprc` and any
token minted during this session (show-once). Nothing is persisted
server-side. Rotation is the only invalidation.

This costs the per-row token list, but that list was never going to support
per-row revoke anyway (constraint 2 above), so the registry would have been
paying storage and lifecycle cost for presentation only.

`specs/pricing-tiers.md` previously conflicted with this: it proposed a
bespoke `drk_live_*` key plus a KV row holding a long-lived Turso token,
redeemed via `POST /service-tokens/exchange`. That has been revised to use
Clerk API keys (already accepted by `authenticated({ allowApiKey: true })`)
against the existing `POST /vault/tokens` route, storing nothing.

## Changes required

### `shared/lib/turso/provision.ts`

`createVaultToken` gains optional `expiration` and keeps `access`:

```ts
const createVaultToken = async (
  vaultName: string,
  access: 'full-access' | 'read-only',
  expiration?: string,
) => { ... }
```

Query string becomes `?authorization=${access}` plus `&expiration=${expiration}`
when provided. Omitting it preserves today's `never` behavior, so existing
callers are unaffected.

### `worker/src/routers/vault.ts`

- `VaultTokenSchema` gains `access: z.enum(['full-access', 'read-only']).default('read-only')`
  and `expiration: z.string().optional()`. The handler currently hardcodes
  `'read-only'`; that becomes the schema default so the CLI `inject` path
  keeps its current behavior.
- New route for invalidation, wrapping `invalidateTokens` from
  `shared/lib/turso/lifecycle.ts:27`. That function is currently reachable
  only indirectly through `suspendVault`, behind the `service()`-gated
  `/vault/lock` used by billing webhooks.
  - Path: `POST /vault/:name/rotate` (add `AppRouteParts.Rotate` to
    `worker/src/constants.ts`).
  - Middleware: `authenticated()` + `restricted()`. Deliberately **not**
    `allowApiKey: true`: rotating is destructive and should require an
    interactive session, not a CI credential.

### `desktop/src/lib/vault-cloud.ts`

Two additions mirroring the existing `provisionCloudVault` shape:

- `issueVaultToken(vaultName, access, expiration, apiHeaders)`
- `rotateVaultTokens(vaultName, apiHeaders)`

### `desktop/src/hooks/use-vault.tsx`

Expose `ownsActiveCloudVault`, `issueToken`, `rotateTokens`, and a
`saveCloudToken(token)` that writes a newly minted token into the active
vault's `cloud.authToken` and persists via `saveVaultConfig`.

### `desktop/src/routes/Vault.tsx` + `desktop/src/components/vault/`

The page currently uses `Tabs` for environments. Restructure so the top
level is `Secrets` | `Credentials`, with the environment tabs nested inside
`Secrets`, rather than mixing environments and a credentials tab in one
list.

New `components/vault/CredentialsTab.tsx`:

- **Current token row**: masked, with reveal and copy. Labeled as stored in
  plaintext in `.deadroprc`, with the config path shown.
- **Issue form**: access radio (`read-only` default), expiry select
  (`7d` / `30d` / `90d` / `never`, defaulting to `30d`), optional label
  (local display only, not sent to Turso). On success, show the JWT once in
  a copy box with an explicit "you will not see this again" warning, plus a
  "save as this vault's sync token" action.
- **Rotate**: destructive, behind a typed confirmation naming the vault.
  Copy must state that it invalidates every token for the database, that the
  CLI, vscode extension, and this app all need a fresh token afterward, and
  that **anyone the vault has been shared with loses access** until they are
  sent a new token out of band. That last consequence is the reason rotation
  is a break-glass action rather than routine hygiene; bounded expiry is the
  routine path. On success, immediately mint a replacement full-access token
  and write it to `.deadroprc` so the user's own sync is not left broken.

## Out of scope

- Moving `authToken` out of `.deadroprc` into the OS keychain. The CLI
  (`cli/lib/global-config.ts`) and vscode extension both read that file, so
  this needs a coordinated cross-surface migration. Tracked in
  `specs/keytar-migration.md`.
- `drk_live_*` API keys and `POST /service-tokens/exchange`
  (`specs/pricing-tiers.md`). No worker router exists for these today.
- Web and vscode parity. `web/pages/vault.tsx` is currently a stub. The
  shared/worker pieces here are platform-neutral so either can adopt later.

## Verification

- `userOwnsVault` unit test: matching prefix, non-matching prefix, and a
  local vault with no `cloud` config.
- `createVaultToken` builds the correct query string with and without
  `expiration`.
- Worker: `POST /vault/tokens` defaults to `read-only` when `access` is
  omitted (guards the CLI `inject` path against regression).
- Manual: mint a `7d` read-only token, confirm it syncs; rotate; confirm
  the old token is rejected and the replacement is written to `.deadroprc`.
