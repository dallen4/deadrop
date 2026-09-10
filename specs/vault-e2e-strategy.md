# Vault E2E Strategy

How deadrop proves that what a customer pays for is what they actually get,
and that being told "no" is handled gracefully on every surface.

Supersedes and consolidates `paid-tier-test-strategy.md` and
`vault-secret-cross-surface-e2e-plan.md`. Companion:
`entitlement-enforcement-gaps.md` (what is still unenforced).

## Premise

**`early_access` is a developer flag, not a test fixture.** It belongs to the
maintainer. Test users must never carry it, because a test user holding it is
not a customer and proves nothing about the paid product.

That constraint sets the whole design. As of 2026-09-07 the entitlement gate
(`authenticated({ feature })`) grants access on plan entitlement, so a Supporter or Pro
account now reaches the vault routes on their own merit. The suite's job is to
keep it that way.

## Two things being tested, and only one is blocked

| | What it asks | Where it lives | Blocked? |
|---|---|---|---|
| **Feature access** | Can this tier do this thing? | Worker API, direct | Partly. `envsPerVault`, `no_captcha`, sharing have no enforcement to test |
| **Resiliency** | What happens when the answer is no? | CLI, in-process | **No.** Start here |

Resiliency is not blocked because the *shape* of a denial does not change when
entitlement lands, only who receives it. Tests written today stay valid across
the pricing flip. That makes it the half of the priority with no dependency,
and it is the half that can only be observed at the surface, because it is
about what a human sees.

Feature-access assertions still get written, as red specs where enforcement is
missing. They are the definition of done for the remaining gap items, not a
lagging check on them.

## Why the CLI is the primary surface

It is the most feature-rich interface: vault CRUD, `env`, `secret`, `apiKeys`,
`inject`, drop/grab, `login`. Web has no vault UI at all, and desktop lacks
`inject`/`secret` parity. It is also the only surface exercising all four
`MintStrategy` paths and both credential types (session and API key), and it is
headless, so it runs in CI without a browser, Electron, or a webview.

The CLI is not, however, where entitlement is *enforced*. That is the Worker.
Testing access through the CLI adds indirection: a red test could be a CLI bug
or a gate. So access assertions hit the Worker API directly, and the CLI carries
resiliency.

## Accounts

Three, no metadata flags, one per plan. Plan is the only axis that costs real
money and cannot be synthesized, so it is the only axis with real accounts.

| Slug | Plan | Provisioned by | Covers |
|---|---|---|---|
| `free` | none | signup | Baseline denial, drop limit, `maxGrabbers` 1, `cloudVaults` 0 |
| `supporter` | `publicMetadata.plan=supporter` | real Stripe checkout | One-time license path, `grantPlan` webhook, 1 vault / 3 envs / 10 API keys |
| `pro` | Clerk Billing (`pla=u:pro`) | real Clerk checkout | Subscription path, 3 vaults, unlimited envs and keys |

Plus `owner` (the maintainer's account, carries `early_access`), used for one
thing only: confirming the experimental bypass still lifts `maxGrabbers` above
the plan cap. Never used to prove a paid feature works.

Deferred: **org**, which needs an org-level subscription and cannot be enabled
until Clerk's Organizations setting is switched to *Membership optional* —
the default "Membership required" mode disables personal accounts and breaks
B2C checkout entirely.

### Credential axis

Not accounts, but distinct middleware paths. All issued to `pro`, so they cost
no extra accounts.

| Credential | Middleware | Reaches |
|---|---|---|
| Session token | `authenticated()` | Everything, including `DELETE /vault/:name` and rotate |
| Clerk API key | `authenticated({ allowApiKey: true })` | Create, tokens, get. **Not** delete or rotate, deliberately |
| Scoped CI key | `apiKey({ scopes: [VaultInject] })` | `POST /vault/tokens/ci` only |
| Service token | `service()` | `/vault/lock`, `/vault/unlock`. No Clerk identity, subject in body |

The API-key path deserves its own coverage because the entitlement gate
short-circuits
on it: the key is treated as proof of entitlement at issuance, so a downgraded
user's existing keys keep working until `/vault/lock` fires. That is deliberate,
and a test should pin it so it is never "fixed" by accident.

## Layers

Real accounts do not carry behavior coverage. They carry the one thing nothing
else can prove: that a real plan, bought through a real checkout, resolves to
the right entitlement against the deployed Worker.

**L1 — unit (vitest, no accounts).** The full plan x limit x feature product
against synthetic claims: `getUserPlan`, `hasFeature`, `getPlanLimits`,
`checkMaxGrabbers`. Adding a plan means adding rows here and nowhere else. Also
holds a consistency test between `tiers.ts` and `plans.ts`, since advertised
numbers are derived but boolean feature labels are still free text.

**L2 — worker routes (vitest, mocked Clerk).** Credential type x route x plan.
Already covers the `cloudVaults` and `apiKeys` caps
(`vault-limits.spec.ts`, `auth-keys.spec.ts`), including the unresolvable-plan
case. Every remaining gap item gets a red test here before enforcement is
written.

**L3 — CLI resiliency (vitest, mocked API, no accounts).** The new work, and
the place to start:

- a 401 from a gated route produces an actionable message and a non-zero exit,
  not a stack trace
- a denied `vault create` leaves no half-written `.deadroprc` and no orphan
  config entry
- `inject` distinguishes "your key is bad" (401) from "we are down" (503) —
  `apiKey()` implements this deliberately via `isCallerFault` and nothing
  currently tests it
- `--ci` without `DEADROP_VAULT_KEY` fails fast rather than silently falling
  back to a session that cannot authenticate
- a 429 from the drop limit reads as a quota message, not a server error
- the ephemeral replica is cleaned up on the failure path, not just the happy
  one

**L4 — live contract (real accounts, Clerk dev instance).** One assertion per
account per entitlement, against the deployed Worker. The only layer that can
catch a purchase completing without granting, a webhook that never fires, or a
plan resolving to `free` because of instance configuration.

**L5 — cross-surface (CLI ↔ VS Code).** Set a secret on one surface, read it
back from the other, proving sync through the shared Turso vault rather than
two independent local files. Parameterized by account, not forked per persona.

**L6 — prod smoke.** Read-mostly, pinned vault names. Prod shares the Turso org
`dallen4` with real users.

## Cross-surface mechanics (L5)

Carried over from the superseded cross-surface plan, whose research still holds:

- **Do not attempt webview-DOM automation.** Neither `@vscode/test-electron` nor
  Playwright supports reaching into a VS Code webview, confirmed by VS Code
  maintainers and the Playwright issue tracker. Test the webview bundle as a
  standalone web app against a fake message adapter if it is ever needed.
- **The extension host's vault module is importable and headless.**
  `vscode-extension/src/lib/vault.ts` has zero VS Code API in the hot path, so a
  test actor imports it directly. No Electron.
- **Seed and assert Turso state directly** via `@libsql/client`, the pattern
  Turso itself documents for e2e.
- **CLI commands are already non-interactive** except `vault delete` and `init`,
  which prompt. Actors isolate state via a scratch `cwd` and call
  `initConfig()`/`saveConfig()` directly rather than spawning `deadrop init`.
- No app-code changes are required for any of this. The gap was always test
  provisioning, never the API surface.

## Provisioning

Accounts are **long-lived fixtures**, reconciled and never recreated, unlike
`web/tests/e2e/global-setup.ts` which creates and deletes a user per run. A real
purchase cannot be re-made every run.

**Token minting is already built.** `worker/src/routers/auth.ts` uses
`clerkClient.signInTokens.createSignInToken({ userId })`, and
`cli/actions/login.ts` exchanges the ticket through `@clerk/clerk-js` with
`standardBrowser: false`. So the harness is: secret key plus user id, mint,
exchange, real session JWT. No password, no browser, no bot challenge. **Re-mint
after any metadata change**, since claims are frozen at mint time. Note the
asymmetry: the gate reads the experimental flags live, so a metadata toggle
takes effect immediately there, while `hasFeature` and `isExperimental` read
claims and need a fresh token.

**Dev instance costs nothing.** Clerk's shared development gateway needs no
Stripe account, so recurring subscriptions there are free. All recurring-plan
coverage lives in dev, which is also the only place with Stripe test clocks for
exercising cancellation into `/vault/lock`.

**Prod stays thin.** `supporter` is a one-time charge with no renewal or
dunning. `pro` is the only recurring prod cost; fund it with a prepaid balance
so a failed payment cannot masquerade as a code regression, and verify the first
renewal actually draws from that balance, since Clerk owns the Stripe customer
record and does not document external crediting.

`pnpm personas:sync` reconciles metadata, mints API keys, writes a gitignored
env file, and *reports* on subscription state rather than creating it. It must
clear a flag by deleting the key, never by writing `false` — `isExperimental` is
a truthiness check, so the string `"false"` would fail open.

## The expectation manifest

`tests/personas/personas.ts` holds each account's expected outcome per
entitlement, in two columns:

```ts
{
  slug: 'supporter',
  expects: {
    vaultCreate:  { now: 'allow', entitled: 'allow' },
    cloudVaults:  { now: 1,       entitled: 1 },
    envsPerVault: { now: null,    entitled: 3 },   // null = unenforced
    apiKeys:      { now: 10,      entitled: 10 },
    dailyDrops:   { now: 5,       entitled: 5 },
    noCaptcha:    { now: false,   entitled: true },
    maxGrabbers:  { now: 5,       entitled: 5 },
  },
}
```

`now` documents reality honestly, including `null` for anything unenforced.
`entitled` is asserted under `PRICING_ENTITLEMENT=on` and is the definition of
done. Both run in CI, so correct post-flip behavior is proven before the flag
flips, and landing an entitlement is a one-line manifest edit whose diff is the
review artifact.

`maxGrabbers` is deliberately identical in both columns. It is the control: if
it ever differs, the harness itself is wrong.

## Isolation hazards

Long-lived shared accounts make these real:

- **Drop counters** are per-user-per-day in Redis (`user:<id>:drops:<date>`).
  A test that exhausts a limit poisons that account until the date rolls.
  Exhaustion tests belong to `free` exclusively, and run last.
- **`POST /vault/:name/rotate`** invalidates every token for the database,
  including other surfaces and share recipients. Rotation tests create and
  destroy their own vault.
- **Vault names** are `sha256(userId)[0:13]-<name>`, so accounts are isolated
  from each other for free, but concurrent runs of the same account are not.
  Suffix a run id, delete in a `finally`, sweep orphans by user prefix.
- Serialization is already in place via `fileParallelism: false` /
  `singleFork: true`.

## Sequencing

1. **L3 CLI resiliency.** Unblocked, no accounts, slots into the CLI's existing
   25 unit specs. Start here.
2. **L1 consistency test** between `tiers.ts` and `plans.ts`.
3. **L2 red tests** for the remaining gap items.
4. **Decode a real Pro token** before wiring anything else to `hasFeature` —
   see the `fea` prefix question in `pricing-tiers.md`. This is cheap and
   gates the value of every Pro assertion below.
5. Persona manifest and `personas:sync`; L4 live contract on the dev instance,
   in CI on merge rather than per PR.
6. L5 cross-surface.
7. L6 prod smoke, once dev is stable.
