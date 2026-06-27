# Cross-platform e2e tests (Vitest)

The 4-way matrix: cli→cli, cli→web, web→cli, web→web. A drop started on one
platform must be grabbable from the other — this is the one suite in the repo
that actually proves `web` and `cli` interoperate, rather than each platform
testing only itself (see `web/tests/e2e/` and `cli/tests/e2e/` for those). See
`specs/cross-platform-e2e-design.md` for the original design.

## How it works

- **Runner:** Vitest (`tests/vitest.e2e.config.mts`). No browser globalSetup —
  each test wires up its own actors.
- **Actors:** `e2e/actors/cli.ts` and `e2e/actors/web.ts` both implement the
  same `DropActor`/`GrabActor` interface (`drop(secret) → {id, link}`,
  `grab(id) → secret`, `dispose()`). `cross-platform.spec.ts` just mixes and
  matches them — it has no platform-specific logic itself.
  - **CLI actor** spawns the built `cli/dist/deadrop.js` as a child process and
    scrapes stdout for the grab link / `Secret: <value>` line, same pattern as
    `cli/tests/e2e/util.ts`.
  - **Web actor** launches a real headless Chromium via `playwright` and drives
    the **deployed** web app's DOM directly. Element IDs (`#begin-drop-btn`,
    etc.) are copied from `web/lib/constants.ts` rather than imported — pulling
    in the web tsconfig isn't worth it for a handful of string constants. If
    those IDs change in `web/`, update them here too.
- **Token bypass:** same Redis-backed `test-tkn`/`test-mode` mechanism as both
  platform-specific suites (`shared/tests/http.ts`). The web actor plants it as
  a cookie + a routed request header (cross-site cookies to the worker get
  blocked, so it's re-attached via `ctx.route`); the CLI actor sends it as
  `TEST_TOKEN` env, same as `cli/tests/e2e`.

## Running

Targets a **live deployment** end-to-end (web app + worker), not localhost —
that's the point: it has to prove the two platforms agree on the real wire
protocol, not a dev-server approximation of it.

```bash
pnpm test:e2e       # builds cli/dist/deadrop.js first, then runs the suite
pnpm test:e2e:run   # skip the CLI build (use when dist/ is already current)
```

Copy `.env.example` to `.env` and fill in `DEADROP_API_URL`, `XPLAT_BASE_URL`,
and `DROP_TEST_TOKEN` for local runs (or `REDIS_REST_URL`/`REDIS_REST_TOKEN` to
read the live token straight from Redis instead of a pinned value).

## Notes / gotchas

- **`XPLAT_BASE_URL`, not `BASE_URL`.** Vite/Vitest reserves `BASE_URL` for its
  own base public path and clobbers anything set under that name — the
  deployed app URL is namespaced as `XPLAT_BASE_URL` to dodge the collision.
  Follow the same `XPLAT_*` prefix for any new env var this suite introduces.
- **Run on macOS / outside the GitHub Linux container.** Same WebRTC/ICE
  constraint the other two suites document — two real peers (browser or CLI)
  can't complete ICE negotiation inside it.
- **Serial only** (single fork, no file parallelism). Real browsers + WebRTC
  peers are resource-heavy and flaky under parallel load.
- **Adding a third platform** (e.g. `vscode-extension`): implement the same
  `DropActor`/`GrabActor` interface in a new `e2e/actors/<platform>.ts` rather
  than special-casing `cross-platform.spec.ts`.

## Files

- `vitest.e2e.config.mts` (package root) — standalone e2e config (run via `-c`
  so the root workspace doesn't pick these specs up).
- `utils/config.ts` — `baseURL`/`apiURL`/timeouts + `getTestToken()`
  (Redis-or-env).
- `utils/cli-process.ts` — child-process wrapper: spawn, `waitFor(regex)`, kill.
- `e2e/actors/types.ts` — `ActorKind`, `DropActor`/`GrabActor` interfaces.
- `e2e/actors/cli.ts` / `e2e/actors/web.ts` — the two actor implementations.
- `e2e/harness.ts` — `roundTrip()`: drop via one actor, grab via another,
  assert the secret matches.
- `e2e/cross-platform.spec.ts` — the 4-way matrix.
