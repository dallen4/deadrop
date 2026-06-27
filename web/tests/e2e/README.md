# E2E tests (Playwright)

These run against a **deployed** environment (not a local server). CI triggers
on Vercel `deployment_status`, resolves which URL to test, and runs the suite.

- **alpha** → `https://alpha.deadrop.io/`
- **Production / main** → `https://deadrop.io/`
- other branches → the generated Vercel preview URL

There are two largely independent halves: the **drop/grab flow** (public,
WebRTC) and the **auth flow** (Clerk + Stripe). Most of the sharp edges below
come from keeping the first half from being held hostage by the second.

## Running locally

The suite targets a deployed URL, so point it at one:

```bash
# drop/grab only (no Clerk/Stripe) — fast, green everywhere
TEST_URI=https://alpha.deadrop.io/ pnpm -F web test:e2e

# include the auth specs (needs the env vars below)
RUN_AUTH_TESTS=1 TEST_URI=https://alpha.deadrop.io/ pnpm -F web test:e2e
```

## The runner is macOS — on purpose

`web_ci_workflow.yml` uses `runs-on: macos-latest`, **not** the Linux
Playwright container. The drop→grab test establishes a real **WebRTC peer
connection** between two browser contexts. That works on macOS runners (and
local machines) but **fails inside the GitHub Linux container** — the two
contexts can't complete ICE in its network sandbox. This suite passed for years
on macOS; the brief move to a container is what broke `drop-flow`. If you
change the runner, the WebRTC specs are the canary.

## Auth gating: `RUN_AUTH_TESTS` / `SKIP_AUTH_TESTS`

Clerk is only reliable against a **stable custom domain** (see below), so the
`stripe-*` / `clerk-*` specs only run when `runAuthTests` is true
(`tests/e2e/config.ts`):

```
runAuthTests = RUN_AUTH_TESTS && !SKIP_AUTH_TESTS
```

- CI sets `RUN_AUTH_TESTS=1` only on **alpha/main** (branch resolved from the
  deployment SHA via the GitHub API).
- `SKIP_AUTH_TESTS=1` is a hard kill switch — disables every auth spec and the
  Clerk sign-in in setup, regardless of branch. Use it to get a fast,
  Clerk-free drop run.

When auth is off, the auth specs are `testIgnore`d and `global-setup` only
seeds the drop token.

## Why a custom domain (alpha.deadrop.io), not the preview URL

Clerk's cookies break on `*.vercel.app`. `vercel.app` is on the Public Suffix
List, so clerk-js's eTLD probe (`__clerk_test_etld`) is rejected and the
session/handshake become unreliable (worst on firefox/webkit). On a domain we
own (`alpha.deadrop.io`) the cookies work normally. This is why auth tests are
restricted to alpha/main — feature branches only have preview URLs.

## How auth tests sign in (storageState + testing token)

This is the canonical Clerk pattern; do not "improve" it back into per-test
sign-ins.

1. **Setup project** (`global-setup.ts`, a Playwright *project*, not a
   `globalSetup` function): `clerkSetup()` obtains a **testing token**, then it
   signs in **once** and saves the session to `tests/e2e/.clerk/user.json` via
   `storageState`. Project-env *does* propagate to workers (verified), so the
   testing token is available everywhere.
2. **Auth specs** load that session with `test.use({ storageState: authFile })`
   — they start already signed in, no per-test sign-in.
3. **Every auth page still calls `setupClerkTestingToken({ page })` in a
   `beforeEach`.** storageState logs you in, but clerk-js still calls the
   Frontend API on each load to verify the session; from CI's datacenter IPs
   that call is bot-challenged *unless* the testing token is injected. Without
   it, clerk-js hangs and `window.Clerk.user` never resolves. **You need both.**

Signing in once (not per test) is what keeps the Clerk dev instance from
rate-limiting/bot-blocking the run.

## The captcha is decoupled from Clerk (don't re-couple it)

`atoms/Captcha.tsx` bypasses the captcha in test mode when the `test-mode`
cookie is present. That bypass runs in its **own `useEffect([])`**, independent
of `useUser().isLoaded`. It used to be nested inside `if (isLoaded)`, which
meant any clerk-js hiccup froze the **public** drop flow at the captcha. Keep
the test-mode bypass Clerk-free.

## The test token (drop/grab bypass)

`global-setup` seeds a random token into Redis (`testTokenKey`, 1h TTL) and
`global-teardown` deletes it. `util.ts` sets it as the `test-tkn` cookie (plus
the `test-mode` flag). The Next API (`/api/captcha`) and the worker (`/drop`)
verify it against Redis to skip the captcha and rate limits. The token lives
exactly as long as the run; the TTL is only a fallback if teardown doesn't fire.

> The CI `REDIS_REST_URL` secret must point at the **same** Upstash instance the
> deployed app reads, or `verifyTestToken` fails and the dropper stalls.

## Required env (auth runs)

Set as CI secrets/vars and, where noted, on the **deployed** environment too:

| Var | Where | Notes |
|---|---|---|
| `DEADROP_API_URL` | CI | worker URL |
| `REDIS_REST_URL` / `REDIS_REST_TOKEN` | CI | same Upstash as the deployed app |
| `CLERK_SECRET_KEY` | CI | dev instance (`sk_test_…`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | CI | `pk_test_…` |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | CI | |
| `STRIPE_SUPPORTER_LOOKUP_KEY` | CI | resolved to a price id in setup |
| `CLERK_WEBHOOK_SIGNING_SECRET` | CI **+ deployed** | see below |

## Webhook specs

`clerk-billing-webhook.spec.ts` and `stripe-webhook.spec.ts` send **signed**
webhook events directly to the deployed endpoints (no Clerk/Stripe delivery
involved). For signatures to verify, the secret the test signs with must equal
the one the deployed app verifies with:

- `CLERK_WEBHOOK_SIGNING_SECRET` — issued by Clerk when you register the billing
  webhook endpoint for an instance. Set it as a CI secret **and** on the
  alpha/main deployment. Until both are set, the clerk-billing spec **skips**
  itself (it does not fail).

## Files

- `playwright.config.ts` — projects (`setup` → browsers → `cleanup`), gating.
- `config.ts` — `baseURL`, `authFile`, `runAuthTests`.
- `global-setup.ts` / `global-teardown.ts` — token + Clerk user + sign-in/save.
- `util.ts` — per-browser context, test cookies, token helpers.
- `drop-flow.spec.ts` / `drop-text-init.spec.ts` — public flow (no Clerk).
- `stripe-checkout.spec.ts` / `stripe-webhook.spec.ts` /
  `clerk-billing-webhook.spec.ts` — auth/billing (gated).
