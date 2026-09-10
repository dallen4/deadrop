# Desktop testing strategy — research & plan

Scope: bring `desktop/` (Tauri v2 shell + React 19 / Vite 7 webview) from zero
test infrastructure to a layered suite that matches the conventions already in
`web/`, `cli/`, `worker/`, and `tests/`.

**Status: plan only. Nothing here is implemented.**

---

## 0. What was verified vs. assumed

Called out up front because the tooling question (§4) turns entirely on a fact
that changed recently.

**Verified against live sources (2026-09-05):**

- Tauri v2 WebDriver docs (`v2.tauri.app/develop/tests/webdriver/`) now read:
  *"Driven directly, only Windows and Linux are supported on desktop, as macOS
  has no WKWebView driver tool available (use the service's embedded WebDriver
  server for macOS)."* The standalone `tauri-driver` binary still does not
  support macOS. **The documented macOS path is now the WebdriverIO service, not
  `tauri-driver`.**
- `@wdio/tauri-service` on npm: first stable `1.0.0` published 2026-05-03,
  latest `1.3.0` published 2026-08-03, ~142k downloads in the last 30 days.
  Maintained under the `webdriverio` GitHub org (`webdriverio/desktop-mobile`),
  not a third-party fork.
- Its macOS support comes from a Rust plugin, `tauri-plugin-wdio-webdriver`
  (crates.io, `1.3.0`, ~92k recent downloads), which runs a WebDriver server
  *inside* the app. The "embedded" provider is auto-detected on macOS and needs
  a `wdio-webdriver:default` capability entry plus debug-build-only plugin
  registration in Rust.
- WebdriverIO's own platform-support page lists a documented macOS caveat: if
  the embedded provider fails there is **no fallback** on macOS (the alternative,
  CrabNebula, is a paid subscription). Linux needs distro-specific
  `WebKitWebDriver`; Windows uses auto-managed msedgedriver.
- `@tauri-apps/api/mocks` exports `mockIPC`, `mockWindows`, `clearMocks`, and
  (since 2.7.0) `mockIPC(fn, { shouldMockEvents: true })`. Documented for use
  with Vitest + jsdom.
- Repo facts: root vitest is `2.1.9` (bundles its own vite 5); `desktop/` is on
  vite `7.3.6`; `desktop/package.json` has no test script and
  `vitest.workspace.ts` has no desktop project; `desktop_ci_workflow.yml` runs
  `macos-latest` / node 24 and does frontend build + `cargo check` only;
  `pnpm -F desktop typecheck` is explicitly non-gating.
- `web/tests/unit/share-pane.spec.tsx` is the existing component-test
  convention: `@testing-library/react` 16 + `@testing-library/jest-dom/vitest`,
  wrapped in a bare `MantineProvider`.
- `worker/src/routers/auth.ts` already exposes `GET /auth/token`
  (`AppRouteParts.CreateSignInToken`) which calls
  `clerkClient.signInTokens.createSignInToken({ userId, expiresInSeconds: 60 })`.
  `cli/actions/login.ts` redeems it with `signIn.create({ strategy: 'ticket' })`.
- The `test-tkn` / `x-test-token` bypass (`shared/tests/http.ts`) is wired into
  `worker/src/routers/drop.ts` and `web/pages/api/captcha.ts` only. It bypasses
  **captcha and rate limits**, never Clerk identity.
- `restricted()` (`worker/src/lib/middleware.ts`) reads
  `user.publicMetadata.early_access || internal` live from Clerk on every call.

**Assumed / not yet verified (must be proven in the spike, §4.4):**

- That `tauri-plugin-wdio-webdriver` builds cleanly alongside this app's exact
  dependency set (`libsql 0.9.30` with `remote`+`replication`, `keyring 4.1.5`
  with the Apple native store, `tauri-plugin-http` with `unsafe-headers`).
  Nothing suggests a conflict; nothing proves there isn't one either.
- That the embedded WebDriver server can drive a webview whose
  `security.csp` is `null` and which monkey-patches `globalThis.fetch`
  (`native-clerk-fetch-patch.ts`). Plausible, unproven.
- That seeding the macOS login keychain via `security add-generic-password
  -s deadrop -a auth-token` produces an entry the `keyring` 4.x
  `apple-native-keyring-store` reads back. The service/account naming lines up
  with `keychain_store.rs`, but round-tripping has not been tested.
- That a GitHub `macos-latest` runner will let an unsigned locally-built app
  read that keychain entry without an interactive authorization prompt. This is
  the single largest schedule risk in the whole plan.

---

## 1. Current state

`desktop/` is the declared "true hub" and is the only workspace with no runtime
verification. Its gates today are `sync-version --check`, `vite build`, and
`cargo check`. `tsc --noEmit` is deliberately non-gating.

PR #165 is the concrete cost. It shipped `ApiKeysSection.tsx`,
`src/lib/auth.ts`'s `useApiKeys`, and owner-gated branching in `Vault.tsx`.
The worker half got `worker/tests/routers/auth-keys.spec.ts`. The desktop half
shipped with nothing.

What that PR actually introduced, graded by where a test would have to live:

| Behaviour | Needs Rust? | Needs network? |
|---|---|---|
| `owned = cloudSync && ownsActiveCloudVault` picks Accordion vs. flat list | no | no |
| `readOnly = cloudSync && !ownsActiveCloudVault` hides `NewEnvironmentInput` | no | no |
| `ApiKeysSection` load effect: loading → list / empty / error states | no | no |
| Its `stale` guard: switching env mid-flight must not apply the old response | no | no |
| Its effect deps are `[vaultName, environment]`, deliberately not the callbacks | no | no |
| `issue()` refetches the list and shows the one-time key | no | no |
| `StatusBadge` revoked > expired > active precedence | no | no |
| `useApiKeys` sends `scopes: [VaultInject]` + target as query | no | no |
| `useApiKeys` throws on `!ok` / `status !== 201` | no | no |
| Bearer token actually reaches the worker from a packaged binary | **yes** | **yes** |
| Worker CORS accepts the Tauri webview origin | **yes** | **yes** |

Eleven of thirteen are webview-only. That ratio is the whole argument in §2.

---

## 2. Layering — recommendation

**Build the component/hook layer first, in `desktop/tests/unit/`, as a new
vitest project. Treat true e2e as a later, deliberately small, nightly-only
smoke layer.**

Three layers exist in principle:

1. **Component / hook tests** — jsdom or happy-dom, Testing Library, Tauri IPC
   mocked via `mockIPC`. No Rust, no network, no window.
2. **True e2e** — WebdriverIO driving the built Tauri binary. Real Rust, real
   keychain, real SQLite, real worker.
3. **Rust unit tests** — `#[cfg(test)]` in `src-tauri`. Out of scope here but
   noted in §8.

Layer 1 earns its keep first, for four reasons:

- **Coverage per unit of cost.** The table above: the interesting logic is in
  the webview. A component layer reaches ~85% of PR #165's new behaviour at
  roughly a day of setup and single-digit seconds per run.
- **The stale guard is only testable there.** Racing two `listApiKeys`
  resolutions and asserting the first one's response is discarded requires
  controlling promise resolution order. Through a real WebDriver session against
  a real worker you cannot do that; you can only hope the race doesn't happen.
- **The e2e layer's blocking risk is unresolved.** §4 recommends WebdriverIO,
  but the macOS story is four months old and three of the four assumptions in §0
  are e2e-layer assumptions. Sequencing the cheap, certain layer behind the
  expensive, uncertain one means the app stays untested while the spike runs.
- **It matches the repo.** `web/` already has exactly this split:
  `tests/unit/*.spec.tsx` component tests plus a separate Playwright e2e
  directory. Desktop should look like web, not invent a shape.

The e2e layer is still worth building, but for a different and much narrower
job: proving the seams that only exist in a packaged binary. Native-mode Clerk
reading the OS keychain, `invoke` reaching `vault_store.rs`, worker CORS
accepting the Tauri origin, `@tauri-apps/plugin-http` routing FAPI calls without
an `Origin` header. That is a handful of tests, not a matrix.

**Explicitly rejected: Playwright against the Tauri window.** Playwright has no
WKWebView/WebView2-embedded driver. It stays the right tool for `web/` and for
`tests/`'s web actor, and is the wrong tool here. Do not try to make
`tests/`'s actor pattern cover desktop by pointing Playwright at it.

---

## 3. Layer 1 — component and hook tests (build this first)

### 3.1 Wiring

Add `desktop/vitest.config.mts` mirroring `web/vitest.config.mts`:

```ts
import { defineProject, mergeConfig } from 'vitest/config';
import configShared from '../vitest.config.mts';

export default mergeConfig(
  configShared,
  defineProject({
    test: {
      include: ['tests/unit/**/*.spec.{ts,tsx}'],
      environment: 'happy-dom',
      setupFiles: ['./tests/setup.ts'],
    },
  }),
);
```

Register it in `vitest.workspace.ts` alongside the other four, and add
`"test": "vitest run"` to `desktop/package.json`.

Three wiring hazards, in order of likelihood:

- **vite skew.** Root vitest 2.1.9 resolves its own vite 5; `desktop/` has vite
  7.3.6. Vitest loads the project config through its bundled vite, so this
  should be fine, but it is the same class of problem as the known
  vitest/vite-skew breakage. Verify the desktop project runs green in the same
  `pnpm test` invocation as the other four before writing a second test file.
  If it does skew, the fallback is a standalone `desktop/vitest.config.mts` not
  registered in the workspace, run as its own `pnpm -F desktop test`.
- **React 19 vs 18.** `web/` pins `@types/react@18`; desktop is on 19 and its
  tsconfig `paths` already pin `react`/`react-dom` type resolution to desktop's
  own copy. `@testing-library/react@16` supports React 19. Add
  `@testing-library/react`, `@testing-library/jest-dom`, and
  `@testing-library/user-event` to `desktop/devDependencies` rather than
  relying on hoisting from `web/`.
- **`happy-dom` vs `jsdom`.** Match `web/` and start on happy-dom (already a
  root devDependency). Switch to jsdom only if a component needs an API
  happy-dom lacks. Nothing in PR #165's surface does.

### 3.2 Test doubles

Two seams, mocked two different ways.

**Tauri IPC → `mockIPC`.** `vault-store.ts` and `vault-config.ts` are thin
`invoke()` passthroughs, so a single command router covers both:

```ts
// tests/setup.ts
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks';
import { afterEach } from 'vitest';
afterEach(clearMocks);
```

Per-suite, register a router keyed on the command name
(`vault_ensure_schema`, `vault_list_secret_names`, `read_app_vault_config`,
`get_auth_token`, …) backed by a plain in-memory object. Because Rust only ever
sees already-encrypted or non-sensitive strings, an in-memory fake is a faithful
double, not a lie.

**Worker HTTP → MSW or a `fetch` stub.** `useApiKeys` builds a real Hono client
against `DEADROP_API_URL`. Prefer intercepting `fetch` over mocking
`@shared/client`, so the query-string shape (`scopes[]`, `vaultName`,
`environment`) stays under test. This is exactly the contract
`worker/tests/routers/auth-keys.spec.ts` asserts from the other side, and
keeping both honest is most of the value.

**Clerk → mock `@clerk/react`'s `useAuth`.** Return a fixed
`{ getToken, userId, sessionClaims }`. Do not pull in `native-clerk.ts` at this
layer; it is a seam for layer 2.

### 3.3 What to write first (ordered)

Priority 1, closing the PR #165 gap:

1. `ApiKeysSection` — loading, empty, populated, and error render paths.
2. `ApiKeysSection` stale guard — start a load for env A, switch to env B
   before A resolves, resolve A late, assert A's rows never render. Use
   deferred promises from the `listApiKeys` double.
3. `ApiKeysSection` refetch-on-env-change — assert `listApiKeys` is called with
   the new `environment`, and that the callbacks being recreated each render
   does **not** cause a refetch loop. This is what the effect-dep comment
   claims; nothing currently enforces it.
4. `ApiKeysSection` issue flow — success shows the one-time key and refetches;
   failure surfaces `issueError` and leaves the list intact.
5. `StatusBadge` precedence — a key that is both revoked and expired reads
   "Revoked".
6. `useApiKeys` — asserts the outgoing query/body shape and that non-ok
   responses throw the user-facing message.

Priority 2, the surrounding vault surface:

7. `Vault.tsx` branch matrix, driven by a mocked `useVault`: local vault
   (flat list, writable), owned cloud vault (Accordion + API Keys, writable),
   shared cloud vault (flat list, `NewEnvironmentInput` hidden). This is the
   `owned` / `readOnly` pair, and the `readOnly` sense is subtle enough
   (a local vault is not read-only) to deserve a pinned test.
8. `CredentialsTab` owner gating, including the "never clear a non-owned
   vault's token" rule `desktop/CLAUDE.md` calls out. That rule is a data-loss
   hazard, which makes it the highest-value assertion in the file.
9. `useVault` — `switchVault` resets environment to `development`;
   `resolveImportedVault` gives an imported cloud vault a fresh local path and
   ignores the sender's `location`.

Deliberately **not** at this layer: drop/grab orchestration. That lives in
`@shared/hooks` and is shared-workspace territory. Desktop should test its
*context adapters* (`DropContext`/`GrabContext` wiring) if anything, not
re-test the hooks.

---

## 4. Layer 2 — true e2e tooling

### 4.1 The evaluation

The historical objection to Tauri e2e was correct and is now stale. It was:
`tauri-driver` is the only documented path and it does not support macOS, and
this repo's desktop CI is macOS. That objection held until roughly May 2026.

The current documented path is `@wdio/tauri-service` with the **embedded**
driver provider: a WebDriver server compiled into the app itself via
`tauri-plugin-wdio-webdriver`, registered for debug builds only. On macOS the
service auto-detects it. `tauri-driver` remains Windows/Linux-only; it is no
longer the recommended entry point on any platform.

Assessed alternatives, briefly:

- **`tauri-driver` + WDIO on Linux CI.** Works, and is the older well-trodden
  path. Rejected as the primary: it would mean building and testing a Linux
  target that nothing else in desktop CI builds, on a runner where two WebRTC
  peers already cannot complete ICE (`specs/cross-platform-e2e-design.md` §8,
  and both `cli_e2e` and `web_ci` are macOS-pinned for this reason). It would
  also exercise the `zbus-secret-service` keychain backend, which needs a live
  D-Bus session plus gnome-keyring on the runner. That is more moving parts than
  the embedded-provider spike, for a platform the product ships to least.
- **CrabNebula's driver.** Paid subscription. Not justifiable for a smoke layer.
- **Vitest browser mode.** Same disqualification as
  `specs/cross-platform-e2e-design.md` §1: it runs tests inside a
  Vitest-controlled page against locally-rendered code. It cannot drive a
  native window, so it is a layer-1 alternative at best, and happy-dom is
  cheaper.
- **No e2e layer at all.** Defensible for another quarter. The seams in §2's
  last paragraph (native Clerk ↔ keychain, `invoke` ↔ `vault_store.rs`, worker
  CORS ↔ Tauri origin) are exactly the ones with no other coverage anywhere in
  the repo, so the answer is "later and small", not "never".

### 4.2 Recommendation

**WebdriverIO + `@wdio/tauri-service` with the embedded provider, macOS-first,
gated behind a timeboxed spike.**

Shape:

- `desktop/tests/e2e/` with `wdio.conf.ts` at `desktop/`.
- `tauri-plugin-wdio-webdriver` added to `src-tauri/Cargo.toml` and registered
  **behind `#[cfg(debug_assertions)]`** so it can never reach a release bundle.
  This is a WebDriver server inside the app; shipping it would be a genuine
  security defect, and the plan should say so in the PR description too.
- `wdio-webdriver:default` added to `src-tauri/capabilities/default.json`.
  Consider a separate `capabilities/test.json` if Tauri's capability config
  supports build-profile scoping cleanly; if not, the `cfg` guard on
  registration is the real defence and the capability entry is inert without it.
- Tests drive `pnpm -F desktop tauri build --debug` output (the root already has
  `desktop:build:debug`), not `tauri dev`, so the shell under test is the
  bundled one.

### 4.3 What the e2e layer tests (keep it this short)

1. **Cold start signed out.** App launches, lands on the sign-in route.
2. **Signed-in boot.** With a pre-seeded keychain token (§5), the app boots
   authenticated and `Clerk.user` resolves. This proves native-mode Clerk +
   `keychain_store.rs` + the `Origin`-suppressing fetch patch, which is four
   files of hand-rolled interception with zero coverage today.
3. **Local vault round-trip.** Create vault, add a secret, read it back after a
   route change. Proves `invoke` ↔ `vault_store.rs` ↔ libsql end to end.
4. **Owned cloud vault shows the API Keys section, and `GET /auth/keys` returns
   200 from the packaged binary.** The one assertion layer 1 structurally
   cannot make, because it is about CORS and the real bearer token.
5. **Drop → grab against the deployed worker,** desktop as dropper, one CLI
   grabber. Stretch; see §7.

Five tests. If it grows past ten, the growth belongs in layer 1.

### 4.4 The spike, before committing to any of this

Timebox: two days. Exit criteria, in order, and stop at the first failure:

1. `cargo add tauri-plugin-wdio-webdriver` and `cargo check` still passes
   alongside `libsql` + `keyring` + `tauri-plugin-http`.
2. A debug bundle launches under WDIO on a local Mac and one trivial assertion
   (window title is `deadrop`) passes.
3. The same passes on a GitHub `macos-latest` runner, unsigned.
4. Test 2 from §4.3 passes with a seeded keychain, with no interactive prompt.

If (1) or (2) fails, the fallback is `tauri-driver` on Linux CI with the
keychain seam stubbed, accepting that macOS ships untested at layer 2. If (3) or
(4) fails, the fallback is layer 2 as a local-only, manually-run suite plus a
documented pre-release checklist. **Layer 1 ships regardless and is not blocked
on any of this.**

---

## 5. Auth in tests

The desktop app is the awkward case: Clerk runs with `standardBrowser: false`,
so there are no cookies and no `localStorage`. `web/`'s `storageState` pattern
does not transfer, and neither does `@clerk/testing/playwright` (it injects a
testing token into a *browser* context).

Two important clarifications, since both were floated in the framing:

- **`DROP_TEST_TOKEN` / `TEST_TOKEN_HEADER` do not help with identity.** That
  mechanism is checked in `worker/src/routers/drop.ts` and
  `web/pages/api/captcha.ts` only, and bypasses captcha and rate limiting. It
  never satisfies `authenticated()` or `restricted()`. It is the right tool for
  the drop/grab test in §4.3(5), and the wrong tool for everything else here.
- **The keychain is the seam, not Clerk.** `native-clerk.ts` gets its identity
  from exactly one place: `invoke('get_auth_token')` →
  `Entry::new("deadrop", "auth-token")`. Everything else follows.

### 5.1 Layer 1

Mock `useAuth` from `@clerk/react`. Provide fixture claim sets: signed out,
signed in plain, signed in with `early_access` (so `isExperimental` is true).
`native-clerk.ts` never loads. Nothing to solve.

### 5.2 Layer 2 — recommended approach

**Mint a Clerk sign-in token server-side, redeem it headlessly in native mode,
and write the resulting client token into the OS keychain before launching the
app.** This is not a new mechanism; it is `cli/actions/login.ts` with the
browser step removed, and the repo already owns every piece.

A `desktop/tests/e2e/fixtures/auth.ts` setup step:

1. `createClerkClient({ secretKey: CLERK_SECRET_KEY })`, then
   `signInTokens.createSignInToken({ userId: DESKTOP_TEST_USER_ID })`. Reuse
   `web/tests/e2e/global-setup.ts`'s seed/cleanup pattern for the user itself,
   including the leftover-user sweep. Do **not** reuse the same
   `clerk_test@deadrop.io` identity: this user needs `early_access` in
   `publicMetadata` to pass `restricted()`, and web's does not.
2. Instantiate a headless `@clerk/clerk-js` in Node exactly as
   `cli/lib/auth/clerk.ts` does (`standardBrowser: false`, the same
   `onBeforeRequest` / `onAfterResponse` interceptors), redeem the ticket with
   `signIn.create({ strategy: 'ticket', ticket })`, and capture the
   `authorization` response header. Factoring that ~40-line factory into a
   shared test helper is worthwhile since it is now the third copy
   (`cli/lib/auth/clerk.ts`, `desktop/src/lib/native-clerk.ts`, this).
3. Write it to the keychain under service `deadrop`, account `auth-token`, then
   launch the app. On macOS: `security add-generic-password -U -s deadrop -a
   auth-token -w <token>`. Tear down with `security delete-generic-password` in
   an `after` hook. **Assumption flagged in §0: the `keyring` 4.x Apple native
   store reading back a `security`-written entry is unverified.** If it does not
   round-trip, the fallback is a tiny Rust test binary in `src-tauri` that calls
   `set_auth_token` directly, built alongside the debug bundle.

Why not the alternatives: driving the real interactive Clerk sign-in through
WebDriver reintroduces bot-challenge flakiness from CI IPs, which is the exact
problem `web/tests/e2e/README.md` documents at length and solved by signing in
once. Adding a test-only Tauri command that injects a token would put a
credential-injection path into the shipped binary, which is a worse trade than
touching the keychain from the test harness.

Auth-dependent e2e tests should be **skipped, not failed**, when
`CLERK_SECRET_KEY` is absent, mirroring `runAuthTests` in
`web/tests/e2e/config.ts`. Fork PRs have no secrets.

---

## 6. Vault fixtures

`vault_store.rs` opens a libsql database at `VaultDBConfig.location`, and
`vault-config.ts` resolves that to `appDataDir()/vaults/<name>.db` with the
config YAML at `appDataDir()/.deadroprc`. Tauri derives `appDataDir()` from the
bundle identifier `com.deadrop`, which on macOS resolves under
`$HOME/Library/Application Support`.

### 6.1 Layer 1

No database. `mockIPC` routes `vault_*` commands to an in-memory map, and
`read_app_vault_config` returns a fixture YAML string. Build three fixture
configs and export them from `desktop/tests/fixtures/vaults.ts`:

- `localVault` — no `cloud` block.
- `ownedCloudVault` — `cloud.name` that `userOwnsVault(userId, name)` accepts.
- `sharedCloudVault` — `cloud.name` owned by a different user id.

`userOwnsVault` is already unit-tested in
`shared/tests/lib/turso-utils.spec.ts`; read that spec to get the naming
convention right rather than guessing at the prefix scheme.

### 6.2 Layer 2 — deterministic real vaults

**Set `HOME` to a per-run temp directory when spawning the app.** That relocates
`appDataDir()` wholesale, so each e2e run starts with no `.deadroprc` and no
`vaults/`, and cleanup is `rm -rf`. This is preferable to seeding a `.db` file,
because a pre-seeded libsql file pins a schema version that `ensureVaultSchema`
would then have to migrate, and the first-run "Create your vault" prompt is
itself worth covering. Drive vault creation through the UI, once, in a setup
spec.

Caveat: on macOS, `HOME` also relocates the login keychain search path. If §5.2
seeds the keychain via `security`, seed it into the *relocated* `HOME` or accept
the real login keychain and drop the `HOME` override in favour of overriding the
bundle identifier in a test-only `tauri.conf` profile. Resolve this in the
spike; the two are entangled and picking wrong costs a day.

### 6.3 Cloud-synced vault paths

**Owned-cloud-vault behaviour is testable; actual Turso replication is not,
and should not be attempted.**

Split by what is being asserted:

- **UI branching on `cloud` presence and ownership** — fully covered at layer 1
  with a fixture config. No Turso involved. This is where the PR #165 gap lives,
  and it is entirely reachable.
- **`GET /auth/keys` for an owned cloud vault** — reachable at layer 2 against
  the deployed worker with a real signed-in `early_access` user. The worker
  derives the vault name from the caller's own `userId`
  (`vaultNameFromUserId`), so the response is deterministic without any
  database being provisioned. Assert on the round-trip and on an issued key's
  claims, not on a pre-existing key list.
- **Replication, `provisionCloudVault`, `rotateVaultTokens`,
  `deleteCloudVault`** — do not test end to end. These provision and destroy
  real Turso databases; running them per-PR means creating and leaking cloud
  resources from CI, and `rotateVaultTokens` is a break-glass operation whose
  failure mode is locking a user out of their own vault. Cover the request/error
  shaping in `vault-cloud.ts` with layer-1 fetch stubs, and leave live
  replication to manual pre-release verification. Note this explicitly in
  `desktop/CLAUDE.md` so it reads as a decision rather than an oversight.

---

## 7. CI

### Per-PR: layer 1 only

Add the desktop vitest project to the existing **`unit_ci_workflow.yml`** run
rather than to `desktop_ci_workflow.yml`. It is a vitest project in the root
workspace, so `pnpm test` picks it up with no workflow change at all beyond
whatever path filters that workflow uses. Cost is seconds. `desktop_ci` keeps
its current job (version sync, frontend build, `cargo check`) unchanged, so the
fast PR check stays fast.

The one thing worth adding to `desktop_ci_workflow.yml`: make
`pnpm -F desktop typecheck` gating once tests exist. Its current non-gating
status was justified by cross-package `tsc` noise, so verify it actually passes
clean before flipping it; if it does not, leave it and say why.

### Nightly: layer 2

New `desktop_e2e_workflow.yml`, `macos-latest`, following the conventions
already established by `e2e_ci_workflow.yml`:

- **Triggers:** `schedule` (nightly) + `workflow_dispatch`. Not `pull_request`.
  A debug Tauri build plus a WebDriver session is minutes, not seconds, and the
  failure modes (keychain access, unsigned binary, embedded driver startup) are
  exactly the flaky-in-CI kind that erodes trust in a required check.
- **Node 22, not 24.** `e2e_ci_workflow.yml` and `web_ci` are both pinned to 22
  for browser-tooling reasons. `desktop_ci` uses 24 today and is fine because it
  never launches a browser; the e2e job does. Start at 22 and only move up
  deliberately. (Note this differs from the CLI's separate node-24 guard.)
- **`Swatinem/rust-cache@v2`** scoped to `desktop/src-tauri`, same as
  `desktop_ci`, or the debug build dominates the runtime.
- **`concurrency`** group with `cancel-in-progress: true`, matching the others.
- **Secrets:** `CLERK_SECRET_KEY`, `DESKTOP_TEST_USER_*`, `DEADROP_API_URL`,
  and `DROP_TEST_TOKEN` only if §4.3(5) lands. Skip auth specs when absent.
- Targets the **deployed** worker, consistent with every other e2e suite here.

Promote to per-PR only after the nightly has been green for two consecutive
weeks, and even then consider a `desktop/src-tauri/**` path filter so webview-
only PRs do not pay for a Rust build.

**Windows and Linux at layer 2: not now.** `@wdio/tauri-service` supports both,
but each adds a distinct driver setup (msedgedriver; distro-pinned
`WebKitWebDriver` + Xvfb + a D-Bus Secret Service provider for the keychain).
Revisit once macOS is stable, and only if a platform-specific bug motivates it.

---

## 8. Phasing

| Phase | Work | Gate |
|---|---|---|
| 1 | vitest project + setup + `mockIPC` harness + fixtures | green in `pnpm test` |
| 2 | Priority-1 tests (§3.3 1-6) — closes the PR #165 gap | per-PR via `unit_ci` |
| 3 | Priority-2 tests (§3.3 7-9) | per-PR |
| 4 | WDIO spike (§4.4), timeboxed 2 days | go / no-go, written up |
| 5 | `desktop/tests/e2e/` + auth fixture + nightly workflow | nightly green |
| 6 | Promote to per-PR, or document why not | 2 weeks green |

Phases 1-3 are independent of everything in §4-§5 and should not wait on them.

Out of scope, worth separate tickets: Rust unit tests in `src-tauri`
(`keychain_store.rs`'s legacy-migration path and `vault_store.rs`'s DTO
handling are both self-contained and currently untested); and folding desktop in
as a third actor in `tests/`'s cross-platform matrix, which only makes sense
after §4.4 says yes.

## 9. Definition of done (phases 1-3)

- `desktop/tests/unit/` exists, registered in `vitest.workspace.ts`, green in
  `pnpm test` alongside the other four projects.
- Every row in §1's table marked "no Rust, no network" has a test.
- The `ApiKeysSection` stale guard and the effect-deps comment are both
  enforced by a test, not by a comment.
- `desktop/CLAUDE.md` gains a Testing section covering the layer split, the
  `mockIPC` convention, and the §6.3 decision not to e2e live Turso.
- No change to `desktop_ci_workflow.yml`'s existing steps, and no change to
  `web_ci`, `cli_e2e`, `e2e_ci`, or the Redis test token.
