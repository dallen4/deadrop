# Vault size limits

Picking and enforcing a maximum size for a cloud vault: large enough to be
practically useful, small enough that Turso billing stays flat and embedded
replica sync stays fast.

Companion to `specs/entitlement-enforcement-gaps.md` (the `envsPerVault` row
there is the same shape of problem as this one) and `specs/post-v1-fast-follows.md`.

Surfaces in scope: `shared/`, `worker/`, `cli/`, `vscode-extension/`, `desktop/`.
Not `web/` — there is no vault UI on web, only tier copy derived from config.

## 1. Research summary

### How a vault is actually stored and read

A cloud vault is one Turso database per vault, provisioned by the Worker
(`shared/lib/turso/provision.ts`) into the `deadrop` group with
`schema: 'parent-vault-schema'`. One table:

```sql
CREATE TABLE secrets (
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  environment TEXT NOT NULL,
  PRIMARY KEY (name, environment)
)
```

`value` is the output of `wrapSecret` (`shared/lib/secrets.ts`):
`base64(iv) + ' | ' + base64(ciphertext)`. With a 12-byte IV and AES-GCM's
16-byte tag, stored bytes ≈ `16 + 3 + ceil((n + 16) / 3) * 4`, i.e. **~1.34× the
plaintext plus ~40 bytes**.

The control plane and the data plane are separate, and this is the single most
important constraint on the design:

- **Control plane** — the Worker creates databases, mints Turso tokens, counts
  vaults. It never sees secret rows.
- **Data plane** — clients hold a full-access Turso token and write **directly**
  to their database via libsql. `worker/src/routers/vault.ts` has no write path
  to intercept.

So a Worker-side check on secret writes is not possible without inventing a
proxy that would break the "no secrets touch our servers" property. Enforcement
has to be (a) client-side in `shared/`, and (b) backstopped inside SQLite itself.

### Write paths

| Path | Callers | Encrypts via | Persists via |
|---|---|---|---|
| `shared/db/secrets.ts` `createSecretsHelpers` | CLI, vscode extension host, web service worker | `wrapSecret` | Drizzle → libsql |
| `desktop/src/hooks/use-vault.tsx` | desktop | `wrapSecret` | Tauri `vault_add_secret` → `desktop/src-tauri/src/vault_store.rs` (Rust libsql) |

Both call `wrapSecret`. **`shared/lib/secrets.ts` is the one isomorphic
chokepoint every surface shares** — a per-value size cap belongs there and
nowhere else. Row-count and total-byte caps need a query, so their *policy* goes
in `shared/` as a pure function and only the *query* is per-runtime.

The realistic blow-up vector is bulk import: `cli/lib/env.ts` `addEnvToVault`
maps a whole parsed `.env` into a single `addSecrets([...])` with no checks.

### External findings

1. Turso Cloud bills on three dimensions — storage GB, rows read, rows written.
   Developer ($4.99/mo) includes 9 GB, 2.5 B rows read, 25 M rows written;
   Scaler ($24.92/mo) includes 24 GB / 100 B / 100 M. Overages: $0.50–$0.75/GB,
   $0.80–$1 per billion rows read, $0.80–$1 per million rows written. Exceeding a
   quota returns `BLOCKED` rather than silently billing.
   https://turso.tech/pricing · https://docs.turso.tech/help/usage-and-billing
2. Turso inherits SQLite's limits: ~1 GB max value size, 2,000 columns, 999 bound
   parameters per statement. No authoritative published max total database size,
   and no documented max HTTP (Hrana) request/response payload — **unconfirmed**,
   so assume a conservative low-tens-of-MB ceiling rather than relying on one.
   https://docs.turso.tech/sdk/http/reference
3. Cloudflare Workers: 128 MB memory per isolate, 5 min CPU on paid, 10,000
   subrequests default. No Worker-imposed response body cap found; 128 MB memory
   is the practical ceiling. Only relevant to us for token minting, since the
   Worker never carries vault rows.
   https://developers.cloudflare.com/workers/platform/limits/index.md
4. Comparable published caps: AWS Secrets Manager **64 KB per secret**, 500,000
   secrets per account. Vercel **64 KB per env var** and 64 KB total per
   deployment (5 KB per var on Edge). GitHub Actions **48 KB per secret**, 100
   secrets per repo/environment, 1,000 per org. Doppler, Infisical and Vault KV
   publish no hard per-value cap — **unconfirmed**, not guessed.
   https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_limits.html ·
   https://vercel.com/docs/environment-variables ·
   https://docs.github.com/en/actions/reference/security/secrets
5. Turso explicitly supports database-per-tenant at "millions" of databases;
   unlimited databases on every paid plan (the 100-DB cap is Free-only). Idle
   databases cost only storage. Scale-to-zero was deprecated for new signups in
   January 2025, so instances are always-on: no cold start, but also no
   free-while-idle beyond the storage line.
   https://turso.tech/blog/multi-tenancy-at-scale

### Synthesis: which dimension actually costs money

The subagent's headline conclusion ("cost scales with rows read/written, not
storage") is right about Turso's price list but wrong about *this* workload, for
one reason it could not know: deadrop uses **libsql embedded replicas**. Steady
state reads are local file reads and cost Turso nothing. What costs rows-read is
**replica bootstrap** — every fresh device, and critically every CI run, pulls
the whole table.

Working the numbers at a 500-row cap:

- 1,000 users × 100 CI runs/month × 500 rows = **50 M rows read/month**, against
  2.5 B included on the $4.99 Developer plan. Two percent of the allowance.
- Rows written are user-initiated edits, orders of magnitude smaller.
- Storage at the cap: 500 rows × 64 KB is a hypothetical 32 MB, but the byte cap
  below binds first at 5 MiB. 9 GB included ≈ 1,800 vaults *all at the cap*;
  realistic vaults are 20–100 KB, so ~100,000 realistic vaults per 9 GB.

**Conclusion: at any sane cap, deadrop does not approach a Turso bill.** The cap
is not a cost-management dial — it is an abuse bound. Without one, a single user
can store a 1 GB value (SQLite permits it) and consume the entire storage
allowance alone. Size the caps for *abuse containment and replica sync latency*,
not for unit economics.

### Gap table

| Capability | `shared/` | `worker/` | `cli/` | `vscode-extension/` | `desktop/` | Native primitive? | Package needed? |
|---|---|---|---|---|---|---|---|
| Per-value size cap | none | n/a (no write path) | none | none | none | Yes — `TextEncoder().encode(v).length`, universal | No |
| Rows-per-vault cap | none | none | none | none | none | Yes — `SELECT COUNT(*)` | No |
| Total-bytes cap | none | none | none | none | none | Yes — `SELECT SUM(LENGTH(value))` | No |
| SQLite-level backstop | schema DDL in `shared/db/init.ts` | parent schema DB (`parent-vault-schema`) | inherits | inherits (host) | duplicate DDL in `vault_store.rs` | Yes — `CHECK` constraint + `BEFORE INSERT` trigger | No |
| Plan limits readable client-side | **no** — `getPlanLimits` lives in `worker/src/lib/billing.ts` | has it | no | no | no | Yes — clients already hold the Clerk JWT | No |

No new dependency is justified anywhere. `TextEncoder` is in the Web Platform and
in Node's globals; `COUNT`/`SUM`/`LENGTH` and `CHECK`/`CREATE TRIGGER` are plain
SQLite. See [[web_core_isomorphism]].

## 2. Recommended limits

```ts
// shared/config/vault-limits.ts
export const MAX_SECRET_VALUE_BYTES = 65_536;   // 64 KiB, plaintext
export const MAX_SECRET_NAME_LENGTH = 255;
export const MAX_SECRETS_PER_VAULT  = 500;      // rows, all environments
export const MAX_VAULT_BYTES        = 5_242_880; // 5 MiB of stored ciphertext
```

**64 KiB per value** matches AWS Secrets Manager and Vercel exactly and beats
GitHub's 48 KB. It comfortably fits every legitimate secret shape: a TLS private
key and chain, a GCP service-account JSON, a multi-megabit RSA key. Stored
ciphertext for a 64 KiB plaintext is ~87 KB.

**500 rows per vault**, counted across all environments. Five times GitHub's
per-environment allowance, so a three-environment project gets ~166 secrets per
environment. Also keeps every full-vault operation a single well-under-999-param
batch, and keeps replica bootstrap sub-second.

**5 MiB total ciphertext** is the backstop that catches the pathological case the
row cap misses (500 × 64 KiB would be 32 MB). It is 50–100× larger than any
realistic vault, and it is what actually bounds the embedded-replica download
that every CI run pays.

### Do not tier these

`PLAN_LIMITS` already tiers `cloudVaults`, `envsPerVault`, `apiKeys`,
`dailyDrops`, `maxGrabbers`. These three should stay **flat, platform-wide
constants outside `PLAN_LIMITS`**:

- A tiered per-value cap means a free/supporter user gets a ceiling that silently
  truncates a legitimate certificate. That is a correctness bug sold as a
  pricing feature.
- The cost analysis above shows these caps do not move the Turso bill, so
  tiering them monetizes nothing while adding a support burden.
- Monetization already has the right levers: vault count, environments per vault,
  sharing. Those are capacity; this is safety.

If a lever is wanted later, `MAX_VAULT_BYTES` is the only honest candidate
(supporter 5 MiB / pro 25 MiB), since it is a direct storage-cost proxy. Add it
to `PlanLimitSet` at that point, not now.

## 3. Implementation plan

### Shared (`shared/`)

1. **`shared/config/vault-limits.ts`** (new) — the four constants above, plus the
   pure policy functions. No I/O, no plan lookup, so every surface imports the
   same module unmodified.

   ```ts
   export const storedBytesFor = (plaintextBytes: number) =>
     19 + Math.ceil((plaintextBytes + 16) / 3) * 4;

   export type VaultUsage = { rows: number; bytes: number };

   export function checkVaultCapacity(
     current: VaultUsage,
     incoming: VaultUsage,
   ): VaultLimitError | null;
   ```

2. **`shared/lib/vault-limits-error.ts`** (or colocate) — a `VaultLimitError`
   subclass of `Error` carrying `{ limit, actual, kind }` so each surface renders
   its own message from structured data rather than parsing a string.

3. **`shared/lib/secrets.ts`** — `wrapSecret` gains the per-value guard as its
   first statement:

   ```ts
   const bytes = new TextEncoder().encode(value).length;
   if (bytes > MAX_SECRET_VALUE_BYTES) throw new VaultLimitError(...);
   ```

   This is the only place the per-value cap needs to exist. Both write paths
   funnel through it, so CLI, vscode, desktop and the web service worker are
   covered by one edit.

4. **`shared/db/secrets.ts`** — add a `getVaultUsage()` helper
   (`SELECT COUNT(*) AS rows, COALESCE(SUM(LENGTH(value)), 0) AS bytes FROM secrets`)
   and call `checkVaultCapacity` at the top of `addSecrets`, summing the whole
   incoming batch before inserting any of it. Bulk import must be all-or-nothing;
   partially importing a `.env` and then erroring is worse than refusing.
   `updateSecret` checks the byte delta only.

5. **`shared/db/init.ts`** — bake the backstop into `ensureSecretsSchema`:

   ```sql
   CREATE TABLE IF NOT EXISTS secrets (
     name TEXT NOT NULL CHECK (LENGTH(name) <= 255),
     value TEXT NOT NULL CHECK (LENGTH(value) <= 90000),
     environment TEXT NOT NULL,
     PRIMARY KEY (name, environment)
   )
   ```

   90,000 is `storedBytesFor(65_536)` rounded up with headroom. Generate it from
   the constant rather than typing a literal, so the two cannot drift.

6. **`shared/lib/billing.ts`** (new) — move `getUserPlan`, `getPlanLimits`,
   `hasFeature`, `isExperimental` out of `worker/src/lib/billing.ts` into
   `shared/`, and have the Worker re-export them. Not needed for these three flat
   caps, but it is the prerequisite for enforcing `envsPerVault` client-side —
   the open item in `specs/entitlement-enforcement-gaps.md` — and it removes the
   duplicate `isExperimental` currently sitting in `web/lib/billing.ts`. Do it in
   the same pass while the area is open.

### Worker (`worker/`)

The Worker never sees a secret write, so it enforces nothing at write time. It
owns the one thing clients cannot bypass:

7. **Parent schema database** — the caps go into the `parent-vault-schema`
   database referenced by `shared/lib/turso/provision.ts`. Turso's multi-DB
   schema feature makes child databases DDL-read-only: a child holding a
   full-access token still cannot `ALTER TABLE` or `DROP TRIGGER`. That turns the
   `CHECK` constraint into a genuine server-side backstop rather than a
   client-side convention.

   Add alongside the `CHECK`:

   ```sql
   CREATE TRIGGER secrets_row_cap BEFORE INSERT ON secrets
   WHEN (SELECT COUNT(*) FROM secrets) >= 500
   BEGIN SELECT RAISE(ABORT, 'vault_row_limit'); END;
   ```

   **Verify before relying on this**: confirm against current Turso docs that
   (a) schema-managed children reject client DDL, and (b) an updated parent
   schema propagates to existing children. Finding 2 above notes Turso's limit
   docs are thin. If propagation does not work for existing databases, ship the
   client-side checks first and treat the schema change as a migration.

8. **`POST /vault`** — no change to the create path itself. Optionally surface
   `usage` on `GET /vault/:name` from Turso's `GetDatabaseResponse` so clients
   can show "3.1 MB of 5 MB" without a table scan.

9. **`worker/CLAUDE.md`** — document that vault content limits are enforced in
   `shared/` and the parent schema, never in a route, so the next person does not
   go looking for a middleware.

### CLI (`cli/`)

10. **`cli/lib/env.ts` `addEnvToVault`** — the highest-risk path. It already
    routes through `addSecrets`, so it inherits the batch check for free once
    step 4 lands. What it needs is a good failure: catch `VaultLimitError` and
    print which variable exceeded the cap and by how much, not a Drizzle stack
    trace.

11. **`cli/actions/secret/add.ts`** — same catch, single-secret phrasing.

12. **`cli/actions/vault/import.ts`** — pre-flight the whole file against
    `checkVaultCapacity` before touching the database, and report the count and
    total up front (`"142 secrets, 88 KB — ok"` / `"would exceed the 500-secret
    limit by 30"`). Refusing before any write is the point.

13. **`cli/actions/vault/list.ts`** — show `rows/500` and `bytes/5 MiB` so the
    ceiling is discoverable before someone hits it.

No Node-specific shim is needed: `TextEncoder` is a Node global, and the SQL runs
through the same libsql client the CLI already uses.

### VS Code extension (`vscode-extension/`)

14. **Extension host `src/VaultPanel.ts`** — owns persistence; already calls
    `h.addSecrets(...)` at line 467, so it inherits both checks. Wrap in a
    try/catch for `VaultLimitError` and post the failure back to the webview.

15. **`src/types.ts`** — add `VaultExtensionMessageType.SecretLimitExceeded`
    carrying `{ kind, limit, actual, name }`. Extend the existing string enum;
    do not invent an ad-hoc message shape.

16. **Webview `views/src/`** — the add-secret form does a cheap optimistic check
    with `MAX_SECRET_VALUE_BYTES` (Web Crypto context, `TextEncoder` available)
    so oversized input is rejected before a round trip, and renders the host's
    `SecretLimitExceeded` message as the authoritative answer. The host check is
    the real one; the webview check is only latency.

### Desktop (`desktop/`)

17. **`desktop/src/hooks/use-vault.tsx`** — the per-value cap arrives free via
    `wrapSecret` (lines 429, 449, 503). The count and byte caps do not, because
    desktop bypasses `shared/db/secrets.ts` entirely and goes to Rust. Call
    `checkVaultCapacity` here, in the webview, before `wrapSecret`.

18. **`desktop/src-tauri/src/vault_store.rs`** — add one command:

    ```rust
    #[tauri::command]
    pub async fn vault_usage(config: VaultDbConfigDto)
      -> Result<VaultUsageDto, String>
    ```

    running `SELECT COUNT(*), COALESCE(SUM(LENGTH(value)), 0) FROM secrets`.
    Rust returns numbers only; the *policy* stays in `shared/`. This preserves
    the file's stated contract — Rust stores and returns opaque values, it does
    not make decisions.

19. **`desktop/src-tauri/src/vault_store.rs` `vault_ensure_schema`** — mirror the
    `CHECK` constraints added in step 5. The comment there already says it
    mirrors `shared/db/init.ts`; keep that true.

20. **`desktop/src/lib/vault-store.ts`** — passthrough for `vault_usage`,
    matching the existing style.

### Web (`web/`) — out of scope, two exceptions

21. **`shared/config/tiers.ts`** — nothing to add, since these caps are not
    tiered. Confirm no tier copy implies an unlimited vault.
22. **Docs** — a limits table on the vault docs page. Publishing the numbers is
    what makes them a product decision rather than a mystery error.

## 4. Parity checklist

| Capability | CLI | vscode | desktop | web SW | Enforced by |
|---|---|---|---|---|---|
| Per-value 64 KiB cap | Yes | Yes | Yes | Yes | `wrapSecret`, one edit |
| 500-row cap | Yes | Yes | Yes | Yes | `addSecrets` (3 surfaces) + `use-vault.tsx` (desktop) |
| 5 MiB byte cap | Yes | Yes | Yes | Yes | same as above |
| SQLite `CHECK` backstop | Yes | Yes | Yes | Yes | parent schema (cloud) + local DDL (local vaults) |
| Pre-flight on bulk import | Yes | n/a | n/a | n/a | `vault import` has no analog elsewhere |
| Usage display (`n/500`) | `vault list` | vault panel | vault pane | n/a | — |

Intentional exceptions:

- **No web vault UI.** Vaults are CLI + vscode + desktop by design; web only
  renders tier copy derived from `shared/config/`.
- **Bulk `.env` import is CLI-only.** The other surfaces add secrets one at a
  time, so a pre-flight summary has nothing to summarize. The underlying batch
  check in `addSecrets` is shared regardless.
- **The Worker enforces nothing at write time**, and that is the architecture
  working as intended, not a gap. Its contribution is the parent schema.

## 5. Open questions

1. **Does an updated `parent-vault-schema` propagate to existing child
   databases?** If not, step 7 becomes a migration over already-provisioned
   vaults and the client-side checks in steps 3–4 carry the whole load until it
   completes. Verify against Turso docs before committing to the ordering.
2. **Can a child database holding a full-access token drop a trigger inherited
   from the parent schema?** The `CHECK` constraint is safe if child DDL is
   blocked; the trigger's value depends entirely on the same answer.
3. **Local-only vaults**: should the caps apply at all? They cost nothing and the
   sync-latency argument does not hold. Applying them uniformly keeps one code
   path and means a local vault can always be promoted to cloud without a
   migration — recommended, but it is a product call.
4. **Existing over-cap vaults.** Almost certainly none exist at current usage, but
   the CLI should degrade to read/delete-only rather than erroring on read if one
   does. Confirm before shipping.
5. **What does `deadrop inject` do in CI when a vault is at the byte cap?** A
   5 MiB replica bootstrap per run is fine at low volume; if inject becomes the
   dominant traffic pattern, revisit whether a read-only non-replicating client
   (`initDBConfig(..., sync: false)`, which already exists) should be the CI
   default.
6. **`envsPerVault` (from `entitlement-enforcement-gaps.md`)** is unenforced and
   needs exactly the shared-billing move in step 6. Land it in this pass or file
   it as an explicit follow-up — do not leave step 6 half-done.
