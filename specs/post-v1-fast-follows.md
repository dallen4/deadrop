# Post-v1.0.0 Fast-Follows

Tracking doc for items deliberately deferred past the v1.0.0 cut. **None of these
block the cut or the merge** — v1.0.0 ships with pricing advertising disabled
(`NEXT_PUBLIC_PRICING_TIERS_ENABLED` off) and features exercised in prod via the
internal/early_access short-circuit. These are the things to burn down before
flipping the pricing flag and/or as general hardening.

**Release split (decided 2026-07-06):**
- **v1.0.1 (patch)** — pure correctness/hardening, no user-facing behavior
  change: #8 (guard checkout route on the pricing flag), the new lock/unlock
  vault-lifecycle test gap, any bugs surfaced by the C-checklist verification
  pass, item E.
- **v1.1.0 (minor)** — #1/#2/#3 (billing entitlement wiring) and the
  `subscription.pastDue` grace-period handling. These change who can do what
  (cloud vault access moves from experimental-gate to plan-gate), so they're
  real behavior changes, not patches. **This is also the release that must
  land before `NEXT_PUBLIC_PRICING_TIERS_ENABLED` gets flipped** — until then,
  the mismatch is harmless because nobody can reach checkout.
- No calendar urgency on any of this — the only hard rule is "flip the flag
  after v1.1.0, not before."

Last updated: 2026-07-06 — re-verified against current code after
`635dc2a fix: harden stripe webhook grantPlan failure handling`,
`67d2e99 feat: lock/unlock cloud vaults on subscription lifecycle`,
`74af58c refactor: consolidate Turso helpers into shared/lib/turso module`, and
`0768d97 feat: redirect pricing page to home when tiers disabled` landed on
alpha. Items marked **DONE** below were closed by those commits. Everything
else was re-confirmed still open by reading the current source directly, not
carried over from memory.

**Net since last pass:** items #6 (grantPlan try/catch) and half of #7
(cancel/reactivate vault lock-unlock) are closed. The core blocker — #1/#2,
cloud vaults gated on `restricted()` instead of plan entitlement — is
untouched and remains the thing that has to land before the pricing flag
flips. A new gap surfaced while verifying #7: the lock/unlock plumbing itself
has no test asserting the vault was actually suspended/restored.

---

## A. Billing entitlement — gates flipping the pricing flag

The refactor landed a correct, centralized plan resolver (`getUserPlan` /
`getPlanLimits` / `hasFeature` in `worker/src/lib/billing.ts`), but the
entitlement layer is not yet wired into routes. **Must be done before charging
real customers**, because today paid features are gated on the wrong axis.

1. **DONE (2026-09-07) — re-gated cloud vaults on entitlement.** `restricted()`
   was folded into `authenticated({ feature })` (`worker/src/lib/middleware.ts`),
   so authorization can no longer be forgotten as a separate chained
   middleware. It
   passes on `hasFeature(claims, feature)`, on the `early_access`/`internal`
   bypass read live from Clerk, or on an API-key caller (the key is itself
   proof of entitlement at issuance). All `/vault` and `/auth/keys` routes now
   gate on `CLOUD_VAULT` / `API_KEYS` rather than the experimental flags. The
   original text follows for context:

   ~~**STILL OPEN — re-gate cloud vaults on entitlement, not experiment.**
   Re-checked `worker/src/routers/vault.ts` directly: `POST /vault` (create)
   is still gated by `restricted()` = `early_access || internal` only. No
   `hasFeature`/`getUserPlan` call anywhere in the router. A paying Supporter
   (with `cloudVaults: 1`) still cannot create a cloud vault; a free user with
   `early_access` still gets unlimited ones. This is still the #1 blocker to
   flipping the pricing flag — the lock/unlock work below did not touch this.~~

2. **DONE (2026-09-07) — `cloudVaults` count enforced on vault create.**
   Counted live via `listVaults` against the prefix, never mirrored. Returns
   403 with an actionable message. Note the deliberate hole: an API-key caller
   has no resolvable plan, so `planLimits` is `undefined` and the count is
   skipped rather than defaulting to the free cap of zero.

3. **PARTIAL — advertised limits.** Now enforced: `dailyDrops` (per plan, both
   the authed and anonymous branches), `cloudVaults` (create), `apiKeys`
   (issuance, counted via `clerkClient.apiKeys.list`). Still unenforced:
   `envsPerVault`, `no_captcha` (unimplemented, not merely ungated), and vault
   sharing. See `specs/entitlement-enforcement-gaps.md`.

3a. **DONE (partial) — subscription-cancellation vault lockout**, which is
    adjacent to this section: `67d2e99` added `POST /vault/lock` and
    `POST /vault/unlock` (service-authed via `service()` middleware —
    timing-safe token compare, confirmed in `worker/src/lib/middleware.ts`)
    that suspend/restore every Turso vault for a `userId` via
    `shared/lib/turso`'s `listVaults`/`suspendVault`/`restoreVault`. This is
    downgrade handling, not upgrade gating — it doesn't address #1/#2 above,
    which are about *granting* access correctly, not revoking it.

4. **Live end-to-end purchase test.** Stripe test-mode checkout → webhook →
   `grantPlan` → JWT refresh → gated action succeeds. Unit tests cover each
   piece; the *seam* between them (where money actually moves) is untested.

5. **JWT refresh UX after purchase.** The buyer's existing session token still
   resolves `free` until it rotates. Confirm the flow forces a refresh vs. makes
   them wait out the token lifetime staring at a still-locked feature.

---

## B. Stripe / Clerk webhook robustness

6. **DONE — `grantPlan` failure handling** (`web/pages/api/webhooks/stripe.ts`,
   commit `635dc2a`). `grantPlan` is now wrapped in try/catch, returns 500 so
   Stripe retries instead of silently dropping the grant. Covered by
   `web/tests/unit/stripe-webhook.spec.ts` (raw-body signature assertion +
   grantPlan-failure path).

7. **clerk-billing webhook TODOs** (`web/pages/api/webhooks/clerk-billing.ts`)
   — re-read the current file directly:
   - **DONE** — `subscriptionItem.canceled` now calls
     `callVaultLifecycle('lock', userId)` → `POST /vault/lock`.
     `subscription.active` calls `callVaultLifecycle('unlock', userId)` →
     `POST /vault/unlock`. The whole handler is wrapped in try/catch that
     returns 500 so Clerk retries on failure — same pattern as item #6.
   - **STILL OPEN** — `subscription.pastDue` is still a bare no-op with a
     `// TODO: flag user for grace period handling` comment. Confirmed
     unchanged.
   - **NEW GAP FOUND** — the e2e test (`web/tests/e2e/clerk-billing-webhook.spec.ts`)
     only asserts the webhook returns 200 for `subscription.active` /
     `subscriptionItem.canceled`. It does not assert that a vault was actually
     suspended/restored (e.g. by querying Turso vault status after the call).
     The lock/unlock *plumbing* is therefore unverified beyond "didn't 500."

8. **STILL OPEN — guard the checkout route on the flag.** `/api/stripe/checkout`
   will still create a session even with `NEXT_PUBLIC_PRICING_TIERS_ENABLED`
   off — the page-level redirect (`web/pages/pricing.tsx`, commit `0768d97`)
   is UX-only, not a server boundary. Add a flag check (404/403 when disabled)
   if the short-circuit needs to be airtight rather than just hiding the UI.

---

## C. Feature verification — the "features have to work" checklist

Highest-risk because they touched code this session. CLI paths were verified
against the live deployment; the web/vscode surfaces were not.

9. **Cloud vaults via the web vault UI and vscode extension.** The base64
   decryption fix and the local→cloud migration were verified from the CLI only.

10. **Multidrop for the internal user.** The billing refactor changed who
    resolves to what cap; confirm the internal/early_access user still gets the
    experimental unbounded path.

11. **vscode extension vault** — shares the `ensureSecretsSchema` extraction and
    the secrets base64 encoding change; verify a full add/reveal/copy round-trip.

11a. **NEW — vscode extension e2e test suite.** No automated e2e coverage of
    the extension exists today (`vscode-extension/CLAUDE.md` only documents a
    manual F5 debug workflow). Build one, following the pattern in
    `specs/cross-platform-e2e-design.md` (`tests/` workspace, actor-pairing
    model), then add `vscode` as a fourth actor alongside `cli`/`web` in the
    cross-platform suite — e.g. `vscode→cli`, `cli→vscode` drop/grab pairs,
    plus vscode-specific vault flows. Natural follow-on to #9/#11 above:
    once the extension's cloud-vault path is manually verified, automate it.

---

## D. Vault storage format — breaking change caveat

12. The base64 encoding fix in `shared/lib/secrets.ts` is a **breaking storage
    format change with no migration path**. Any vault with secrets written by a
    pre-fix build is unreadable (hard crash on decrypt) afterward. Accepted
    because zero real Turso vaults exist. **If any early-access user provisioned
    a vault before this fix, they must `vault delete` + recreate.** Consider a
    read-side fallback shim only if a real affected vault surfaces.

---

## E. Minor test-coverage gaps (low priority)

13. `checkout.ts`: empty `emailAddresses[]` would crash → 500; untested.
14. `checkout.ts`: the origin host-fallback branch (`?? https://${host}`) and
    `return_url` contents are never asserted.

---

## F. e2e flake — multidrop WebRTC crashes poisoning shared browser workers

15. **`multidrop.spec.ts` crashes cascade into unrelated specs in the same
    Playwright worker.** Observed on PR #111 (alpha→main, v1.0.0 release):
    `web/tests/e2e/multidrop.spec.ts` opens real WebRTC peer connections
    (1 dropper + 2 grabbers), which is heavy under CI resource constraints —
    especially on `webkit`/`Mobile Safari`/cross-browser projects. Same class
    of weakness as the already-documented "WebKit cross-browser tests are
    disabled (Playwright WebRTC limitation — see issue #97)" note in
    `web/CLAUDE.md`, just surfacing in a project that isn't disabled yet.
    With `workers: 3` (`web/playwright.config.ts`), when multidrop crashes or
    times out mid-test, the *next* spec scheduled onto that same worker
    inherits a dead browser and fails with
    `Error: browser.newContext: Target page, context or browser has been closed`
    — that's why `stripe-checkout.spec.ts` failures showed up alongside
    multidrop failures in the same run; they're collateral, not an
    independent regression (confirmed: everything billing/vault/pricing
    related passed clean in that run — 65 passed, only multidrop + its
    blast radius flaked).

    Reproduced identically across 3 consecutive reruns of the same PR commit —
    same `1 failed [Chrome to Firefox] multidrop` + `7 flaky` + `65 passed`
    shape each time, only the innocent-bystander spec caught in the blast
    radius changed run to run (`stripe-checkout` → `drop-flow` →
    `stripe-checkout` again). Confirms it's resource contention, not test
    order or a specific spec interaction.

    Likely root cause: `workers: 3` (`web/playwright.config.ts`) lets up to 3
    spec files run concurrently on the CI runner. `multidrop.spec.ts` alone
    opens 3 real WebRTC contexts (1 dropper + 2 grabbers) per invocation: if
    2-3 workers each land on a multidrop instance at once (across the 9
    browser projects — chromium/firefox/webkit/Mobile Chrome/Mobile Safari/
    Chrome-to-Firefox/Firefox-to-Chrome, not counting the setup/cleanup
    utility projects), that's 6-9 simultaneous real peer-connection
    negotiations competing for CPU/network on a shared runner — plausible
    cause of the timeouts and browser crashes.

    Fix options — confirmed `-j/--workers` is a real CLI override
    (`playwright test --help`), but `workers` is one global pool per
    invocation; Playwright has no way to give one file fewer workers than the
    rest *within a single run*, so splitting into two invocations is required
    either way, not just stylistic:
    (a) drop `workers` to 1 globally — simplest, guaranteed to remove the
        contention, but multiplies total e2e wall-clock time for every spec,
        not just multidrop;
    (b) isolate `multidrop.spec.ts` into its own low-concurrency run —
        needs a small `playwright.config.ts` change first (an env-gated
        `testIgnore` entry, following the exact pattern already used for
        `runAuthTests`/stripe-clerk specs) to exclude it from the main
        invocation, then a second CI step:
        `ISOLATE_MULTIDROP=1 pnpm test:e2e` (main suite, workers:3) followed
        by `pnpm test:e2e --workers=1 -- tests/e2e/multidrop.spec.ts`
        (isolated). No existing `@tag` grep convention in this codebase to
        piggyback on — checked, zero `@`-tagged tests exist — so this is a
        config change, not a CI-only change. Preferred: surgical, doesn't
        slow down the rest of the suite, same job (no second runner cost);
    (c) extend the existing webkit-disable precedent to cross-browser combos
        for multidrop specifically, matching issue #97's reasoning.

---

## G. CLI self-update

16. **DONE — `deadrop update` command.** Implemented: `cli/actions/update.ts` +
    `cli/lib/update/{version,binary,npm,download,checksum}.ts`, registered in
    `core.ts`. Distinguishes install method via a build-time-baked
    `DEADROP_INSTALL_METHOD` constant (`'binary'` in `bun-build.ts`, `'npm'` in
    `esbuild.js`) rather than a runtime `typeof Bun` check — cleaner, and
    consistent with how the other platform constants (`DEADROP_API_URL` etc.)
    are baked. Verified both build scripts set it correctly.

---

## H. CLI auth: plaintext file → native OS keychain

17. **DONE — moved CLI auth token storage off a plaintext file onto the OS
    keychain.** Landed in PR #122 (`feat: implement CLI auth caching via
    native keychains`, `feat: add whoami command and platform-aware keychain
    errors`). `cli/lib/auth/cache.ts` now stores tokens via the OS keychain
    (keytar/Bun.secrets per the design in `specs/keytar-migration.md`) and
    migrates/removes any legacy plaintext `.deadrop/creds` file it finds. The
    `deadrop whoami` command was added alongside it. Docs updated in
    `web/pages/docs/features/cli.mdx` and `features/index.mdx`.
