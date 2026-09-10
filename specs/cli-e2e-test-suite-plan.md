# CLI e2e test suite plan

Prove out CLI-to-CLI drop/grab e2e tests that mirror the web Playwright
suite, then evolve into a cross-platform suite where any actor (CLI or
browser) can drop or grab across a single WebRTC mesh.

## Goals

1. **M1:** A CLI-to-CLI drop flow spec that runs against the **deployed
   worker** (same target philosophy as web e2e), proving a real
   `node-datachannel` WebRTC connection between two Node processes.
2. **M2:** Reuse web's existing harness (token seeding, config, CI runner)
   by **copying first, then lifting the minimum** shared surface once green.
3. **M3:** A cross-platform matrix where drop/grab is parametrized by
   **actor** (`cli | chromium | firefox | webkit`), yielding cli to cli,
   cli to web, web to cli, and web to web from one test body.

## Why this shape

- The CLI happy path is **non-interactive with args**, so no PTY automation
  is needed for the core flow:
  - `deadrop drop "secret"` skips the inquirer prompt (`cli/actions/drop.ts:22`)
    and prints the grab link via `logInfo` (`cli/logic/drop.ts:50`), then stays
    alive on "Waiting for grab request...".
  - `deadrop grab <id>` takes the id directly as an arg (`cli/core.ts:45-49`).
- The grab link is `<DEADROP_API_URL>/grab?drop=<id>`
  (`shared/lib/util.ts:23`), so the grabber id is
  `new URL(link).searchParams.get('drop')`. No fragile scraping of decorated
  output.
- Web's `util.ts` already parametrizes the flow by actor via the
  `dropBrowser` / `grabBrowser` worker options
  (`web/tests/e2e/util.ts:23-26`). That is the exact seam M3 generalizes.

## The actor abstraction (keystone for M3)

Transport-agnostic interface, two implementations:

```ts
interface DropActor {
  drop(secret: string): Promise<{ link: string; id: string }>;
}
interface GrabActor {
  grab(idOrLink: string): Promise<string>; // returns decrypted secret
}

// CliActor — spawns `node dist/deadrop.js`, parses link from stdout,
//            extracts ?drop=<id>, keeps the drop process alive until grab
//            completes, then tears it down.
// WebActor  — drives a browser page (the body of drop-flow.spec.ts).
```

These helpers are runner-agnostic (CliActor is plain `child_process`), so the
runner does not need to be unified — only the actor contract does. M1/M2 run
under **Vitest** (the repo's runner; no browser involved). For M3, Vitest's
browser mode loads **Playwright** as its provider, so a single Vitest run drives
both the CLI (node) and browser actors. The full matrix (cli→cli, cli→web,
web→cli, web→web) falls out of one test body parametrized by actor, the same
way web's `dropBrowser`/`grabBrowser` options work today.

## Parsing the drop id (no production change)

The grabber id is recoverable from existing stdout with zero CLI changes.
`cli/logic/drop.ts:50` prints `Use grab link: <chalk.bold>…/grab?drop=<id></…>`
and `:52-57` prints a terminal QR block. The QR block contains no
`grab?drop=` substring, so the link line is unambiguous:

```ts
const id = stripAnsi(stdout).match(/grab\?drop=([^\s&]+)/)?.[1];
```

We start by scraping this. If the test contract ever feels brittle as the
matrix grows (M3), we can revisit a stable machine-readable marker then, but
it is deliberately out of scope to keep the first proof simple.

## Risks to design around

1. **Test-token bypass (now a M1 concern, since we target the deployed
   worker).** Web seeds a token into Redis and sends it as a cookie so the
   worker skips captcha and rate limits (`web/tests/e2e/util.ts:39-43`,
   `global-setup.ts`). The CLI hits `/drop` via the Hono RPC client and does
   **not** send that token today. Plan:
   - Test harness seeds the token into Redis (reuse web's `global-setup`).
   - Spawn the CLI with `TEST_TOKEN=<token>` in env.
   - CLI sends it as a request header (e.g. `x-deadrop-test-token`) when
     present; the worker `/drop` route verifies the header against Redis in
     addition to the existing cookie path.
   - This is the one cross-cutting integration change. Scope it before M1
     can go green against deployed.
2. **WebRTC / ICE in CI.** Web's README is explicit that the Linux container
   cannot complete ICE between two peers, which is why the runner is
   `macos-latest`. Two local `node-datachannel` processes will hit the same
   constraint. Run CLI e2e on the **macOS runner** and treat the CLI
   drop→grab spec as the same canary.
3. **Build artifact.** e2e must run against the built `cli/dist/deadrop.js`
   (or the bun binary), not the TS source, so it exercises esbuild bundling,
   env baking, and libsql native resolution. Add a build step before the
   suite.
4. **Process lifecycle.** The drop process is long-lived. The `CliActor`
   must keep a handle, wait for grab to complete, then kill it (and on
   timeout) so runs do not leak processes.

## Milestones

### M1: Prove it out (copy first, deployed target)

- [x] Test-token injection, **no worker change**. A cookie is just a request
      header, and Node/Bun fetch both send a manually-set `Cookie` (verified),
      so the CLI sends `Cookie: test-tkn=<token>` and the worker's existing
      `getCookie` path accepts it. Plumbing: `apiHeaders` added to
      `shared/types/common.ts` + forwarded in `shared/handlers/drop.ts`; CLI
      sets the cookie when `TEST_TOKEN` is present (`cli/logic/drop.ts`, no-op
      in prod). Worker and `shared/tests/http.ts` are untouched.
- [x] `cli/tests/e2e/util.ts` — `CliProcess` + `dropCli`/`grabCli` fixtures
      (spawn, parse link, resolve on stdout, kill on teardown). Copied from
      web's util patterns, no premature sharing.
- [x] `cli/tests/e2e/cli-drop-flow.spec.ts` — mirrors
      `web/tests/e2e/drop-flow.spec.ts`: drop "super secret value", parse id,
      grab, assert equality.
- [x] Runs via Vitest (`cli/vitest.e2e.config.mts`, standalone via `-c`;
      `global-setup.ts` seeds/teardowns the token). `pnpm -F cli test:e2e`
      builds then runs. Same runner as the rest of the repo, no browser deps.
- [x] Token seeded into the same Redis the deployed worker reads
      (`global-setup.ts` globalSetup + returned teardown, copied `redis.ts`).

Verified locally: prod changes build (CLI esbuild green), worker route
typechecks, all e2e files resolve/transpile, and Vitest loads the e2e config +
runs globalSetup (reaching the Redis call, i.e. wiring is sound — it just needs
real creds to proceed).

Still needed to see green end-to-end (environmental, not code). No worker
deploy required since the worker is unchanged:
1. Provide `DEADROP_API_URL` + `REDIS_REST_URL`/`REDIS_REST_TOKEN` (same
   Upstash the deployed worker reads), then `pnpm -F cli test:e2e`.
2. Run on macOS (ICE/WebRTC constraint inherited from web).

Finding (fixed): the CLI grab path used to exit non-zero on **success**
(`cli/actions/grab.ts` cleanup → `process.exit(1)`). Now `grab` tracks the
handler's Confirm/Failure event and exits 0 only on a verified grab; every
other teardown path exits non-zero. The actor still reads the secret from
stdout (grab calls `process.exit()` right after logging it).

Exit criteria: cli→cli drop of a text secret passes against the deployed
worker on macOS.

### M2: Lift the minimum shared surface

- [x] **Resolve the shared test-token race (stable token, no worker change).**
      `test_tkn` now holds a stable value persisted in Redis (no TTL), mirrored
      by the `DROP_TEST_TOKEN` repo secret + `cli/.env`. Suites just read it:
      cli reads `DROP_TEST_TOKEN` from env (no seed/teardown, deleted
      `global-setup.ts`/`redis.ts`); web stopped seeding/deleting (`global-
      setup`/`global-teardown`) and reads the stable value from Redis via the
      unchanged `util`/`verifyTestToken` (so `/api/captcha` keeps working).
      No worker change, no deploy, no `web_ci` change. Eliminates the
      cross-suite collision that would otherwise be guaranteed once the
      cross-platform job runs on `deployment_status` alongside `web_ci`.
- [ ] (Optional) Lift the now-tiny shared bits (`config.ts` apiURL, the token
      env read) into one place both suites import. Low value now that seeding
      is gone — actor helpers stay package-local.
- [x] Wire CLI e2e into CI on the macOS runner
      (`.github/workflows/e2e_ci_workflow.yml`): push to main/alpha (path-
      filtered to cli/shared) + PRs to main/alpha + manual dispatch,
      `environment: Preview`, reads the build-time + automation secrets.
      web_ci stays standalone; the cross-platform job + `deployment_status`
      trigger land at M3.
      **Verify:** that those secrets actually live in the `Production`
      environment (the web suite reads them under a Vercel deployment
      environment) — adjust `environment:` if not. Optionally add
      `pull_request` later for PR gating (left off to avoid e2e flake blocking
      merges).

### M3: Cross-platform matrix

- [ ] Introduce `DropActor` / `GrabActor` interfaces with `CliActor` and
      `WebActor` implementations.
- [ ] Generalize the `dropBrowser` / `grabBrowser` options into
      `dropActor` / `grabActor` (`cli | chromium | firefox | webkit`).
- [ ] One parametrized flow spec yields cli→cli, cli→web, web→cli, web→web.
- [ ] Add the headline mixed case: drop from CLI, grab in browser.

## Fast-follow: DROP_TEST_TOKEN rotation workflow

The stable token (M2) is a deliberate trade: one long-lived bypass value
instead of per-run churn. To bound its lifetime, a scheduled workflow rotates
it. It is the inverse of the thing we just made permanent.

**Trigger:** `schedule` (cron, e.g. monthly `0 6 1 * *`) + `workflow_dispatch`.

**Job (ubuntu, no e2e):**
1. Generate a new random token (`openssl rand -base64 32` / node crypto).
2. Update Redis: `SET test_tkn <new>` (no TTL). This is what the worker `/drop`
   and web `/api/captcha` verify against.
3. Update the repo secret: `gh secret set DROP_TEST_TOKEN --body <new>`.

**Auth wrinkle:** the default `GITHUB_TOKEN` cannot write Actions secrets. The
rotation job needs a fine-grained PAT (or GitHub App token) with
`secrets: write`, stored as its own secret (e.g. `GH_SECRETS_TOKEN`) and passed
as `GH_TOKEN` to the `gh secret set` step. Redis creds reuse the existing
`REDIS_REST_*` secrets.

**Rotation window (single-key caveat):** between updating Redis and a CI run
re-reading the new secret, an in-flight run still holding the *old* secret value
will fail verification. Mitigations: schedule at a quiet hour; keep steps 2–3
adjacent. For **zero-downtime** rotation, pair it with the Option B upgrade
(worker verifies via `SISMEMBER test_tkns`): rotation `SADD`s the new token,
keeps the old for a grace window, then `SREM`s it — both old and new valid
during the overlap. That's the clean long-term shape if rotation cadence ever
goes high.

**Ordering:** write Redis first, then the secret. A run that reads the new
secret before Redis is updated would fail; the reverse (Redis new, secret old)
also fails — hence the grace-window upgrade is the real fix if the window
matters.

## Open questions

- Test-token transport: dedicated header vs reusing an existing auth header
  on the `/drop` route. Confirm the worker change is minimal and does not
  weaken the production path.
- Do we build `dist/deadrop.js` (Node) only for e2e, or also smoke-test the
  bun binary to catch libsql/keychain bundling issues? Likely Node for M1,
  bun binary as a later add.
- Interactive paths (init wizard, prompt-driven drop) are out of scope for
  this suite. If we want them later, add a PTY layer
  (e.g. `cli-testing-library`) as a separate concern.

## Files (anticipated)

- `cli/lib/api.ts` or `/drop` request path — send test-token header (edit).
- `worker/` `/drop` route — verify test-token header against Redis (edit).
- `cli/tests/e2e/util.ts` — `CliActor`, spawn/teardown, link parsing (new).
- `cli/tests/e2e/cli-drop-flow.spec.ts` — the M1 spec (new).
- `cli/vitest.e2e.config.mts` — standalone Vitest e2e config (new).
