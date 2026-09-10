# Vault size limits

Caps on cloud vault size. These are **abuse bounds, not product limits** — no
legitimate user should ever meet one. Companion to
`specs/entitlement-enforcement-gaps.md` (`envsPerVault` is the same shape).

Scope: `shared/`, `worker/`, `cli/`, `vscode-extension/`, `desktop/`. Not `web/`
— no vault UI there.

## Limits

```ts
// shared/config/vault-limits.ts
export const MAX_SECRET_VALUE_BYTES = 131_072;    // 128 KiB, plaintext
export const MAX_SECRET_NAME_LENGTH = 255;
export const MAX_SECRETS_PER_VAULT  = 5_000;      // rows, all environments
export const MAX_VAULT_BYTES        = 26_214_400; // 25 MiB stored ciphertext
```

- **128 KiB per value** — 2× AWS Secrets Manager and Vercel, ~3× GitHub Actions.
  Clears a TLS key plus chain, a GCP service-account JSON, a fat kubeconfig.
  Hard error, because the alternative is good: anything larger is a *file*, and
  deadrop already drops files. Say so in the message.
- **5,000 rows** — a six-environment monorepo at 120 vars each is 720. Supporter
  gets only *one* vault, so it plausibly holds every project a person owns. Real
  job is bounding row counts the byte cap misses (a million 1-byte rows is 50 MB
  but makes every sync miserable).
- **25 MiB total** — the actual abuse bound, 250–1,000× a realistic vault
  (20–100 KB). Bounds the replica bootstrap every CI run pays.

**Not tiered.** A tiered per-value cap silently truncates a legitimate cert for a
free user — a correctness bug sold as a pricing feature. Monetize on vault count,
environments, sharing. `MAX_VAULT_BYTES` is the only honest future candidate.

## Why these numbers don't move the bill

Turso bills storage GB, rows read, rows written (Developer $4.99/mo: 9 GB,
2.5 B read, 25 M written; overage $0.50–0.75/GB, ~$1/B read, ~$1/M written).

deadrop uses **libsql embedded replicas**, so steady-state reads are local and
free. Rows-read cost is replica *bootstrap* — every fresh device, every CI run.

At the caps, assuming every user maxed out: 1,000 users × 100 CI runs/mo × 5,000
rows = 500 M rows read, 20% of the included allowance. Storage: 9 GB ÷ 25 MiB =
~360 fully-abused vaults, or ~100,000 realistic ones. 1,000 abused vaults ≈
$16/mo overage.

So the caps aren't a cost dial. Without one, a single user stores a 1 GB value
(SQLite permits it) and eats the storage allowance alone. Size for abuse
containment and sync latency.

Sources: [pricing](https://turso.tech/pricing) ·
[usage](https://docs.turso.tech/help/usage-and-billing) ·
[AWS](https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_limits.html) ·
[Vercel](https://vercel.com/docs/environment-variables) ·
[GitHub](https://docs.github.com/en/actions/reference/security/secrets)

## Where enforcement can live

Control plane and data plane are separate: the Worker creates databases and mints
tokens but **never sees secret rows** — clients hold a full-access Turso token and
write directly. There is no route to gate without breaking "no secrets touch our
servers."

Two write paths, both calling `wrapSecret` (`shared/lib/secrets.ts`):

| Path | Callers | Persists via |
|---|---|---|
| `shared/db/secrets.ts` `createSecretsHelpers` | CLI, vscode host, web SW | Drizzle → libsql |
| `desktop/src/hooks/use-vault.tsx` | desktop | Tauri → `vault_store.rs` (Rust) |

`wrapSecret` is the one isomorphic chokepoint — per-value cap goes there and
nowhere else. Count/byte caps need a query, so their *policy* is a pure function
in `shared/` and only the *query* is per-runtime.

Highest-risk path: `cli/lib/env.ts` `addEnvToVault` maps a whole `.env` into one
`addSecrets([...])` with no checks.

No new dependency anywhere — `TextEncoder`, `COUNT`/`SUM`/`LENGTH`, `CHECK`, and
a field on an API call the Worker already makes. See [[web_core_isomorphism]].

## Plan

### Shared

1. **`shared/config/vault-limits.ts`** (new) — the constants, plus
   `storedBytesFor(n)` (`19 + ceil((n + 16) / 3) * 4`, ~1.34× plaintext) and
   `checkVaultCapacity(current, incoming)`.
2. **`VaultLimitError`** — carries `{ kind, limit, actual }` so each surface
   renders its own copy from structured data, not a parsed string.
3. **`shared/lib/secrets.ts`** — per-value guard as `wrapSecret`'s first
   statement. One edit covers all four surfaces.
4. **`shared/db/secrets.ts`** — `getVaultUsage()`
   (`SELECT COUNT(*), COALESCE(SUM(LENGTH(value)), 0)`), then
   `checkVaultCapacity` at the top of `addSecrets`, summing the whole batch
   before inserting any of it. Bulk import must be all-or-nothing.
   `updateSecret` checks the byte delta only.
5. **`shared/db/init.ts`** — `CHECK (LENGTH(value) <= 180000)` and
   `CHECK (LENGTH(name) <= 255)` in `ensureSecretsSchema`. Generate 180000 from
   the constant so they can't drift.
6. **`shared/lib/billing.ts`** (new) — move `getUserPlan`/`getPlanLimits`/
   `hasFeature`/`isExperimental` out of `worker/src/lib/billing.ts`; Worker
   re-exports. Not needed for these flat caps, but it's the prerequisite for
   `envsPerVault` and it kills the duplicate `isExperimental` in `web/lib/`.

### Worker

7. **DONE — Turso `size_limit`.** `createVault` PATCHes
   `/{db}/configuration` with `TURSO_DB_SIZE_LIMIT = '100mb'`.
   [Docs](https://docs.turso.tech/api-reference/databases/update-configuration):
   *"Values with units are also accepted, e.g. 1mb, 256mb, 1gb."*

   100mb against a 25 MiB app cap because `size_limit` measures the database
   *file* — page granularity, PK index, free pages after deletes, WAL history for
   replica sync. A churning vault sits at several times its live row bytes, so a
   tight limit fires on a legitimate vault. The gap is deliberate: users meet the
   app-level error, which knows which secret and which limit; `size_limit` is the
   fuse for when client-side enforcement was bypassed. Don't go below ~25mb.

   Supersedes the byte half of the parent-schema idea — per-database, set at
   creation, no schema propagation needed. Keep the parent schema only for the
   per-value `CHECK` (step 5), which `size_limit` can't express.

8. **DONE — rollback.** A failed PATCH left an uncapped vault that still counted
   against the owner's `cloudVaults` quota, permanently burning a Supporter's
   only slot. `createVault` now best-effort `deleteVault`s and rethrows.
9. **`GET /vault/:name`** — surface `usage` from `GetDatabaseResponse` so clients
   show "3.1 MB of 25 MB" without a table scan.
10. **`worker/CLAUDE.md`** — note that content limits live in `shared/` and the
    parent schema, never a route.

### CLI

11. **`cli/lib/env.ts`, `cli/actions/secret/add.ts`** — inherit the checks via
    `addSecrets`; catch `VaultLimitError` and name the offending variable, not a
    Drizzle stack trace.
12. **`cli/actions/vault/import.ts`** — pre-flight the whole file before touching
    the database (`"142 secrets, 88 KB — ok"` / `"would exceed by 30"`).
13. **`cli/actions/vault/list.ts`** — show `rows/5,000`, `bytes/25 MiB`.

### VS Code extension

14. **Host `src/VaultPanel.ts`** — owns persistence, already calls `addSecrets`
    (line 467); catch and post back to the webview.
15. **`src/types.ts`** — add `VaultExtensionMessageType.SecretLimitExceeded`
    with `{ kind, limit, actual, name }`. Extend the enum, no ad-hoc shapes.
16. **Webview** — optimistic pre-check for latency only; the host's answer is
    authoritative.

### Desktop

17. **`desktop/src/hooks/use-vault.tsx`** — per-value cap arrives free via
    `wrapSecret`; count/byte caps do not, since desktop bypasses
    `shared/db/secrets.ts`. Call `checkVaultCapacity` here.
18. **`vault_store.rs`** — add `vault_usage` running
    `SELECT COUNT(*), COALESCE(SUM(LENGTH(value)), 0)`. Rust returns numbers
    only; policy stays in `shared/`, per the file's stated contract. Also mirror
    step 5's `CHECK` constraints in `vault_ensure_schema`.
19. **`desktop/src/lib/vault-store.ts`** — passthrough for `vault_usage`.

### Web

20. Confirm no tier copy implies an unlimited vault; publish a limits table in
    the vault docs.

## Parity

| Capability | CLI | vscode | desktop | web SW |
|---|---|---|---|---|
| 128 KiB per-value | Yes | Yes | Yes | Yes |
| 5,000 rows | Yes | Yes | Yes | Yes |
| 25 MiB total | Yes | Yes | Yes | Yes |
| `CHECK` backstop | Yes | Yes | Yes | Yes |
| `size_limit` fuse | Yes | Yes | Yes | Yes |
| Usage display | `vault list` | panel | pane | n/a |

Intentional exceptions: no web vault UI (by design); bulk `.env` pre-flight is
CLI-only (nothing to summarize elsewhere — the batch check in `addSecrets` is
shared regardless); the Worker enforces nothing at write time, which is the
architecture working, its contribution being provisioning-time.

## Open questions

1. **What does Turso do when a database hits `size_limit`?** Docs define the
   field, not the behaviour — writes rejected, reads too, which error through
   libsql and through replica sync? Test with a 1mb scratch database. The whole
   fuse depends on this.
2. **Does Turso 409 on a duplicate database name?** If it returns the existing
   database instead, step 8's rollback is belt-and-braces rather than load-bearing.
3. **Does an updated `parent-vault-schema` propagate to existing children?** Only
   affects the per-value `CHECK` now. If not, it's a migration — not urgent.
4. **Can a child with a full-access token `ALTER TABLE` away an inherited
   `CHECK`?** If yes, the parent-schema constraint is convention, and
   `size_limit` plus the client check are the real enforcement.
5. **Local-only vaults** — apply the caps? Costs nothing and the sync argument
   doesn't hold, but uniform application keeps one code path and lets a local
   vault be promoted to cloud without migration. Recommended; product call.
6. **Existing over-cap vaults** — almost certainly none, but reads should degrade
   to read/delete-only rather than erroring.
7. **`deadrop inject` at the byte cap** — 25 MiB bootstrap per run is fine at low
   volume; if inject dominates, revisit whether the non-replicating client
   (`initDBConfig(..., sync: false)`) should be the CI default.
8. **`envsPerVault`** needs the step 6 move. Land it here or file it explicitly.
