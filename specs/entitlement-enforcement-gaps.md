# Entitlement Enforcement Gaps

What the paid tiers advertise versus what the code enforces, as of the audit on
2026-09-07. Companion to `specs/paid-tier-test-strategy.md`, which describes how
to test these once they exist.

Items marked **[A-n]** are also tracked in `specs/post-v1-fast-follows.md`
section A. Testing strategy lives in `specs/vault-e2e-strategy.md`.

## Status

**Updated 2026-09-07.** Five of ten advertised capabilities are now enforced,
up from one. The remaining five are feature builds, not wiring.

| Capability | Advertised (`tiers.ts`) | Configured (`plans.ts`) | Enforced? | Ref |
|---|---|---|---|---|
| `maxGrabbers` | multidrop by tier | 1 / 5 / 25 / 100 | **Yes** | `checkMaxGrabbers` |
| Daily drops | 3 / 5 / unlimited | 3 / 5 / Inf | **Yes** (fixed) | `getPlanLimits(claims).dailyDrops`, both branches |
| Cloud vault access | Supporter 1, Pro 3 | — | **Yes** (fixed) | `authenticated({ feature: CLOUD_VAULT })` |
| Vault count limit | as above | `cloudVaults` | **Yes** (fixed) | counted via `listVaults` on create |
| API keys | 10 / unlimited | `apiKeys` | **Yes** (fixed) | counted via `clerkClient.apiKeys.list` on issue |
| Environments per vault | 3 / unlimited | `envsPerVault` | No | no reader; enforcement point is client-side, see below |
| No captcha on drops | Supporter+ | `NO_CAPTCHA` | No, unimplemented | `requireCaptcha` has no reader or writer |
| VS Code extension | Supporter+ | `VSCODE_EXTENSION` | No | extension does not check |
| Vault sharing read / write | Supporter / Pro | `VAULT_SHARING_*` | No | no reader exists |
| 30-day audit log | Pro | not modeled | No | no code, slug removed |
| SSO, RBAC, service accounts | Org | not modeled | No | no code, slugs removed |

Net effect today: a Supporter now receives cloud vault access, a vault
allowance, an API key allowance, and a raised `maxGrabbers`. The gap that
remains is `envsPerVault`, `no_captcha`, and sharing.

**`envsPerVault` has no server-side enforcement point.** Environments live in
the vault's own SQLite and the `.deadroprc` config; the Worker only ever sees an
environment name inside an API key's claims. So the limit has to be enforced
where environments are created (`vault env add` in the CLI, the desktop
Environments pane), which means shipping plan limits to the client rather than
gating a route. That is a different shape of work from the rest of this list and
should not be filed alongside it.

## Findings from the audit

### 1. The daily drop limit was inverted against signing in — FIXED

Anonymous callers go to `checkAndIncrementUserDropCount`, capped by
`DAILY_DROP_LIMIT = 5` from `worker/wrangler.toml`. Signed-in callers go to
`checkAndIncrementAuthUserDropCount` with a hardcoded `PLAN_LIMITS.free.dailyDrops`
of 3 (`worker/src/routers/drop.ts:84`).

So signing in **lowered** your limit from 5 to 3, and a Pro subscriber paying
for unlimited drops also got 3. Fixed: both branches now share one
`getPlanLimits(claims)` call, and an anonymous caller resolves to the free tier
by construction. `DAILY_DROP_LIMIT` is gone from `wrangler.toml`.

With the tier ladder now set at free 3 / supporter 5 / pro unlimited, the
anonymous cap of 5 is the value that no longer fits: it exceeds the free tier
and exactly equals what a Supporter pays $15 for. The anonymous limit has to
come down to at most the free limit, otherwise signing up is a downgrade and
the Supporter drop allowance is worth nothing.

Fix is one line. `checkAndIncrementAuthUserDropCount` already accepts a `limit`
and already short-circuits on `Infinity` (`worker/src/lib/cache.ts:112`), so the
call site becomes `getPlanLimits(claims).dailyDrops`.

The drop limit used to live in **four** places, now two (`plans.ts` and the
derived pricing copy):

| Source | Used for |
|---|---|
| `PLAN_LIMITS.*.dailyDrops` (`shared/config/plans.ts`) | intended source of truth |
| `DAILY_DROP_LIMIT` (`worker/wrangler.toml`) | anonymous enforcement (`cache.ts:92`) |
| `daily-drop-limit` Vercel Edge Config | web cookie set in `web/middleware.ts:36` |
| `tiers.ts` copy strings | pricing page |

The clean consolidation is to have the anonymous path read
`PLAN_LIMITS.free.dailyDrops` too and delete the wrangler var, which makes
anonymous and free identical by construction, removes a whole class of drift,
and means signing in can never reduce what you can do. The Edge Config value
then becomes a display concern only, and should be derived rather than set by
hand.

### 2. `no_captcha` is unimplemented, not merely unenforced

`requireCaptcha` is declared at `shared/types/drop.ts:17` and is never read or
written anywhere in the repository. There is no plan check to add, because there
is no captcha-skipping path to gate. This is an implementation task, not a
wiring task, and it is the one advertised Supporter feature with no code behind
it whatsoever.

### 3. Advertised limits track configured limits only by hand — PARTLY FIXED

Resolved as of this pass: the ladder is free 3, supporter 5, pro unlimited, and
`tiers.ts` copy now matches `plans.ts`. They had diverged mid-edit, with the
copy still showing the previously committed 5 and 15.

Numeric labels in `tiers.ts` are now **derived** from `PLAN_LIMITS`, so they
cannot drift. Boolean feature labels are still free text with nothing tying them
to `FEATURE_SLUGS`, which is how "CI/CD pipeline injection: not included"
survived on the Free tier while free users could inject from a local vault all
along. A `FEATURE_LABELS: Record<FeatureSlug, string>` would make an unbacked
feature a type error; it is blocked on deciding whether to re-add the removed
`audit_log`/`sso`/`rbac`/`priority_support` slugs or cut the copy.

### 4. Reading plan data from `sessionClaims` is not a supported Clerk path

> **Update.** The gate resolves entitlement from live `publicMetadata` as well
> as from claims, so Supporter no longer depends on the session template
> projecting `plan`. Pro still does, since Clerk Billing subscriptions are not
> metadata. Separately, `has()` is stubbed to `() => false` on machine auth
> objects in `@clerk/backend` 3.17.1, so it is not a drop-in replacement for
> `hasFeature` on API-key routes.

### 5. Enabling org plans would break personal subscriptions

Clerk's "Membership required" mode has been the default since 2025-08-22. It
disables personal accounts and forces signed-in users into
`choose-organization`, so they never reach a personal-subscription state.
`PLAN_SLUGS` already declares `ORG: 'org_team'` alongside user plans, so turning
on org billing without first setting *Membership optional* in Organizations
settings would stop B2C checkout working. Not urgent, but it must not be
discovered during an org launch.

## Suggested order

Landed 2026-09-07: per-plan drop limits (plus the anonymous cap folded onto the
same constant), the 429 fix, `restricted()` folded into `authenticated()` as
an optional `feature` gate, and the
`cloudVaults` / `apiKeys` count caps, each with route tests.

Remaining, in order:

1. **Decode a real Pro session token.** Cheap, and it gates everything else:
   if Clerk emits `fea` with a `u:` scope prefix, `hasFeature` returns false for
   every Pro feature while Supporter (hardcoded list) keeps working. See the
   flagged block in `pricing-tiers.md`.
2. **Rename the Clerk dashboard feature slug** `ci_tokens` → `api_keys` to match
   `FEATURE_SLUGS`. Free right now; expensive once a real Pro subscription
   exists.
3. **`has()` migration — now known to be partial at best.** Reading `pla`/`fea`
   off `sessionClaims` is explicitly not Clerk's supported path, but `has()`
   **cannot replace it wholesale**: `@clerk/backend` builds machine auth objects
   with a stubbed `has: () => false`, so every API-key route would start
   returning 401 if the gate migrated naively. Any migration has to keep a
   separate path for API keys. Sequence after (1), and scope it to session
   routes only.
4. **`envsPerVault`**, as client-side enforcement (see above).
5. **`no_captcha`.** Needs implementing before it can be gated.
6. Sharing, audit log, org features. Each is a feature build.

The `usePricingTiersActive` flag is no longer blocked by items 1 through 3 of
the original list, but flipping it still means a Supporter cannot skip captcha
and cannot be held to an environment limit. Whether that is acceptable at launch
is a product call, not an engineering one.
