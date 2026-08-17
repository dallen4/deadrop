# Eliminating `syncUrl` from vault config

`CloudVaultConfig.syncUrl` is redundant. It can be derived, or refetched, from
data already present. This documents the analysis and the recommended change.

## Status

**Shipped** in [#153](https://github.com/dallen4/deadrop/pull/153). `authToken`
stays persisted, for the reason in "Resulting shape" below.

## Finding: the hostname is fully deterministic

Turso database URLs follow a fixed pattern
([reference](https://docs.turso.tech/reference/libsql-urls)):

```
libsql://[DB-NAME]-[ORG-NAME].turso.io
```

There is no random component. Given the database name and the organization
slug, the URL is computable.

## The name is already stored; an id would not help

`CloudVaultConfig` (`shared/types/config.ts`) is:

```ts
type CloudVaultConfig = {
  name: string;      // full prefixed remote name, e.g. "a1b2c3d4e5f67-work"
  syncUrl: string;   // libsql://a1b2c3d4e5f67-work-<org>.turso.io
  authToken?: string;
};
```

`name` is written from the worker's response in all three surfaces
(`desktop/src/lib/vault-cloud.ts:27`, `cli/actions/vault/create.ts:49`,
`vscode-extension/src/VaultPanel.ts:301`) and is always the full prefixed
form produced by `vaultNameFromUserId`. That is exactly the `[DB-NAME]`
component of the URL.

**So `syncUrl` is already a pure function of `name` plus the org slug, and
nothing new needs storing.** This is worth stating plainly because the
instinct to replace it with a `cloudId`/`id` would make things worse: the
identifier Turso returns alongside the hostname is `DbId`, a UUID
(`shared/types/db.ts`), and it does **not** appear in the hostname. Storing
`DbId` would give you an identifier you cannot build a URL from, on top of the
`name` you would still need. The correct move is to delete a field, not
trade one for another.

## The original rationale inverts on inspection

`syncUrl` was stored to absorb a possible Turso organization change. It does
the opposite.

Changing orgs changes every hostname, because the org slug is *in* the
hostname. Every stored `syncUrl` in every `.deadroprc` on every user's machine
would then point at a host that no longer exists, and each would need
rewriting. A derived URL picks up the new org the moment the client knows
about it, with no config migration.

The data migration is unavoidable either way, as noted. The difference is
that storing the URL adds a second migration (every client config) on top of
it, and that one is the hard one, because those files are on machines you do
not control.

## Where the org slug comes from

This is the real decision. `TURSO_ORGANIZATION` is currently a worker-only
env var (`c.env.TURSO_ORGANIZATION`); no client knows it.

**Option A: bake the org slug into every client build.** A new build-time env
var in `web`, `cli`, `desktop`, and `vscode-extension`. Clients then compute
`syncUrl(`${cloud.name}-${org}.turso.io`)` locally with no round trip. Cost:
four more build-time vars to keep in sync across repo VARS and release
SECRETS, which has broken releases before.

**Option B (rejected): take the hostname from the mint response.** The worker
already returns `hostname` from both `POST /vault` and `POST /vault/tokens`,
so `{ hostname, authToken }` could be a transient pair fetched together and
never persisted.

This does not work, because **you cannot assume the user owns the vault they
are connecting to.** Both worker routes derive the vault name from the
*caller's own* `userId` via `vaultNameFromUserId`, so they only ever describe
vaults that caller owns. For a vault belonging to someone else, there is no
mint call to make and therefore no hostname to receive.

That case is reachable today, not just once sharing ships: desktop's
`pickExternalVaultConfig` (`desktop/src/lib/vault-config.ts`) imports an
arbitrary `.deadroprc`, which may reference a cloud vault owned by another
account. `userOwnsVault` exists precisely to detect it. Planned read/write
vault sharing (`vault_sharing_read` / `vault_sharing_write` in
`shared/config/plans.ts`) makes it the common case rather than an edge one.

The same reasoning rules out dropping `authToken` from persisted config. For
a vault you do not own, the stored token is the **only** way in and cannot be
reissued by you, so it has to persist. Mint-on-open is only viable for vaults
you own, and a design that works for one ownership case and silently fails
for the other is worse than one that persists uniformly.

**Decision: hardcode it as a shared constant.** No env var in any surface.

```ts
// shared/lib/constants.ts
export const TURSO_ORGANIZATION = 'dallen4';
```

This is not a secret and is not per-environment: `worker/wrangler.toml:10`
already carries it as a plain, non-encrypted `TURSO_ORGANIZATION = "dallen4"`
var. Making it a shared constant moves an existing hardcoded value somewhere
all four surfaces can read, rather than introducing new configuration.

`shared/lib/constants.ts` is the established home for exactly this kind of
cross-surface deployment constant, alongside `APP_IDENTIFIER`,
`CONFIG_FILE_NAME`, and `DEFAULT_VAULT_NAME` (and `APP_IDENTIFIER` already
sets the precedent of a constant carrying a comment about what it must stay
in sync with).

Changing the Turso org is a planned, far-off migration that requires moving
every database anyway. Recompiling with a different constant is a rounding
error against that, and a code change is easier to review and roll back than
four build-var updates across separate release pipelines.

**Also fold the worker onto the same constant.** `worker/src/routers/vault.ts`
reads `c.env.TURSO_ORGANIZATION` in six places; pointing those at the shared
constant and dropping the var from `wrangler.toml` (plus the field from
`worker-configuration.d.ts` and `web/types/worker-configuration.d.ts`) leaves
one source of truth instead of two that can drift.

Nothing is lost by this. The only place the value ever differs from
`dallen4` is `worker/tests/routers/vault-tokens.spec.ts:32`, which injects
`'test-org'` purely as a mock. The env var was never used to point an
environment at a real second org, so removing it gives up no deployment
capability. Tests assert against the constant instead.

## Resulting shape

```ts
type CloudVaultConfig = {
  name: string;
  authToken?: string;  // retained: irreplaceable for vaults you don't own
  // syncUrl removed, derived from `name` + org slug
};
```

`authToken` staying in plaintext YAML remains a real problem, but it is the
keychain migration's to solve (`specs/keytar-migration.md`), not this
change's.

## Blast radius

| File | Change |
|---|---|
| `shared/lib/turso/utils.ts` | add `vaultSyncUrl(name, org)` returning `libsql://{name}-{org}.turso.io`; existing `syncUrl(hostname)` stays |
| `shared/types/config.ts` | drop `syncUrl` from `CloudVaultConfig`; `authToken` stays |
| `shared/db/init.ts` | `initDBConfig` derives the sync URL from `cloudConfig.name` + org slug |
| `shared/db/migrate.ts` | `tursoUploadUrl()` fed from the derived URL |
| `desktop/src-tauri/src/vault_store.rs` | drop the `syncUrl` serde field; derived URL passed in from the webview |
| `desktop/src/lib/vault-store.ts` | drop from the local cloud type |
| `desktop/src/lib/vault-cloud.ts` | stop folding `hostname` into config |
| `cli/actions/vault/create.ts` | same |
| `cli/lib/auth/vault-token.ts` | `MintedVaultCreds` drops `syncUrl` |
| `vscode-extension/src/VaultPanel.ts` | stop writing `syncUrl` into `vaultConfig.cloud` |
| `cli/tests/unit/{inject,vault-token}.spec.ts` | fixtures drop the field |
| `shared/lib/constants.ts` | add `TURSO_ORGANIZATION = 'dallen4'` |
| `worker/src/routers/vault.ts` | six `c.env.TURSO_ORGANIZATION` reads point at the constant |
| `worker/wrangler.toml` | drop the `TURSO_ORGANIZATION` var |
| `worker/worker-configuration.d.ts`, `web/types/worker-configuration.d.ts` | drop the field |
| `worker/tests/routers/vault-tokens.spec.ts` | drop the `'test-org'` env injection |

No build-time env vars are added, so nothing new is needed in repo VARS or
release SECRETS.

## Back-compat

For existing configs, the derived URL is byte-identical to the stored one:
both are `libsql://{name}-{org}.turso.io` and the org has not changed. So
readers can ignore a stored `syncUrl` outright and no migration step is
needed. Old clients reading a config written by a new client would break, so
this wants to land before any surface writes configs without the field, or
tolerate its absence for a release.
