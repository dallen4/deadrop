# CLAUDE.md — shared/lib/turso/

Turso Platform HTTP API layer for cloud vault databases. Consumed by the
Worker (`worker/src/routers/vault.ts`) for provisioning + lifecycle, and by
`cli`/`web`/`vscode-extension` for URL helpers only. Replaces the former
`shared/lib/turso.ts` (URL helpers) and `worker/src/lib/vault.ts` (HTTP calls),
which were collapsed into this module.

## Files

- `client.ts` — generic Turso Platform API client. `createTursoClient(org, apiToken)`
  returns `{ get, post, patch, del }` bound to
  `https://api.turso.tech/v1/organizations/{org}/databases`. Throws on non-2xx.
- `provision.ts` — `createProvisionHandlers(client)` → `createVault`,
  `createVaultToken`, `getVault`.
- `lifecycle.ts` — `createLifecycleHandlers(client)` → `updateConfiguration`,
  `invalidateTokens`, `suspendVault`, `restoreVault`, `deleteVault`.
- `utils.ts` — pure URL protocol helpers (`fileUrl`, `syncUrl`,
  `syncUrlToHttps`, `tursoUploadUrl`). Safe to import anywhere (no I/O).
- `index.ts` — `vaultNameFromUserId`, `createVaultUtils` (merges provision +
  lifecycle handlers), and re-exports.

Import `utils` directly (`@shared/lib/turso/utils`) from client-side code to
avoid pulling the HTTP layer; import the barrel (`@shared/lib/turso`) from the
Worker.

## Credentials & topology

- **One** Worker (`deadrop.nieky.dev`, single wrangler env) holds
  `TURSO_ORGANIZATION` (`dallen4`, in `[vars]`) and `TURSO_PLATFORM_API_TOKEN`
  (secret). One Turso org backs every environment.
- The platform token lives **only** in the Worker. Never replicate it into
  Vercel/web. Anything web needs (billing webhooks locking vaults, etc.) goes
  **through a Worker endpoint**, not direct Turso calls — see "Lifecycle" below.

## Database naming (the enumeration invariant)

`vaultNameFromUserId(userId, vaultName?)` →
`<sha256(userId)[0:13]>` optionally `-<vaultName>`, truncated to 63 chars.

- All of a user's cloud vaults share the **`<hash13>` prefix**.
- To act on *every* vault a user owns (e.g. lock-on-cancel), list org databases
  and filter by that prefix. This is the only safe way to fan out in the shared
  `dallen4` org without touching other users' databases.

## Vault data model (see `shared/types/config.ts`)

- **One Turso database per cloud vault.** `CloudVaultConfig` is singular
  (`{ name, syncUrl, authToken }` under `VaultDBConfig.cloud`).
- **Environments are local-only.** `VaultEnvironments` maps env-name → local
  file path; they do **not** spawn separate Turso databases today.
- A user may hold **multiple** cloud vaults. Plan caps in
  `shared/config/plans.ts` → `PLAN_LIMITS.*.cloudVaults`: free `0`,
  supporter `1`, pro `3`, org `∞`. `envsPerVault` is a local/aspirational limit,
  not a Turso-DB multiplier. Cloud vault access is gated by
  `FEATURE_SLUGS.CLOUD_VAULT`.

## Provisioning path (Multi-DB Schema)

`createVault(vaultName, seed?)`:
- No `seed` → `{ schema: 'parent-vault-schema' }`: new vault is a **child of the
  parent schema DB**; the `secrets` table structure propagates from the parent.
  This is Turso's Multi-DB Schema feature, **deprecated for new orgs** but
  grandfathered for existing paid orgs like `dallen4`.
- `seed: 'database_upload'` → migrating an existing local CLI vault to cloud
  (`migrateToCloudSync`); does not use Multi-DB Schema.

Escape hatch if Multi-DB Schema is ever revoked: drop the `schema` param, create
a plain DB, and call `ensureSecretsSchema()` (`shared/db/init.ts`, idempotent
SQL) right after provisioning. Also note: the parent schema DB cannot be deleted
while children exist, and schema migrations write-lock all children.

## Lifecycle (billing-driven) — implemented

`lifecycle.ts` handlers for pause/lock/delete:
- `suspendVault` — `block_reads + block_writes` via configuration PATCH, then
  `invalidateTokens` (auth/rotate). **Locks** a vault.
- `restoreVault` — clears the read/write block. **Unlocks**.
- `deleteVault` — hard delete (caller: `DELETE /vault/:name`).

Billing wiring runs through the **`clerk-billing.ts`** webhook (that's where
Clerk delivers subscription lifecycle with user identity attached — not
`stripe.ts`, which only handles `checkout.session.completed → grantPlan`):

```
subscriptionItem.canceled → POST {worker}/vault/lock   { userId }   → suspendVault × N
subscription.active        → POST {worker}/vault/unlock { userId }   → restoreVault × N
```

- **Service auth, not Clerk.** Both endpoints use `service()` middleware
  (`worker/src/lib/middleware.ts`) — a constant-time check of the
  `SERVICE_TOKEN_HEADER` (`@shared/lib/constants`) against
  `WORKER_SERVICE_TOKEN`. The token authenticates the *caller*; the subject
  `userId` travels in the body. Set the secret on both surfaces:
  `wrangler secret put WORKER_SERVICE_TOKEN` + the same value in Vercel env.
- **Fan-out.** The endpoint resolves `<hash13>` via `vaultNameFromUserId(userId)`,
  `listVaults(prefix)`, then maps `suspendVault`/`restoreVault` over every match.
  A user with no cloud vaults → `{ locked: 0 }` (no-op, still 200).
- **Webhook returns 500 on Worker failure** so Clerk retries (a canceled user
  must not retain cloud access). Enabling the skip-gated
  `web/tests/e2e/clerk-billing-webhook.spec.ts` therefore also requires
  `WORKER_SERVICE_TOKEN` + a reachable Worker.
- **Org payers are a known gap.** `subscriptionItem.canceled` may carry an
  `organization_id` instead of `user_id` (the `org_team` plan). Vaults are named
  per *individual* user, never per org, so an org id can't be resolved to a
  vault set without enumerating members (a Clerk member-list call). The webhook
  `resolveUserId()` returns `null` for org payers and **skips** rather than
  guessing — locking org vaults on cancel is a separate feature.
