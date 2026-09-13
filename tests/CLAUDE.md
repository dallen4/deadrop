# CLAUDE.md — tests/

Cross-platform e2e suite: drives `web` and `cli` "actors" against the same **deployed** drop/grab flow to prove they interoperate (a drop started on one platform must be grabbable from the other). See `specs/cross-platform-e2e-design.md` for the original design.

This is distinct from `web/tests/e2e/` (Playwright, web-only) and `cli/tests/e2e/` (CLI-to-CLI only) — those test each platform in isolation; this workspace tests them against each other, and against the real `alpha.deadrop.io` + Worker deployment rather than a local dev server.

## Commands

```bash
pnpm test:e2e       # builds cli/dist/deadrop.js first, then runs the suite
pnpm test:e2e:run   # runs the suite without rebuilding the CLI
```

Requires `tests/.env` locally (copy from `.env.example`) — `DEADROP_API_URL`, `XPLAT_BASE_URL`, `DROP_TEST_TOKEN`, and (optionally) `CLOUDFLARE_ACCOUNT_ID`/`CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_KV_NAMESPACE_ID` to read the live test token directly from Cloudflare KV instead of a pinned env value. CI injects these as real env vars.

## Directory Structure

```
tests/
├── e2e/
│   ├── cross-platform.spec.ts  # 4-way matrix: cli→cli, cli→web, web→cli, web→web
│   ├── harness.ts              # roundTrip() — drop via one actor, grab via another, assert match
│   └── actors/
│       ├── types.ts            # ActorKind, DropActor/GrabActor interfaces
│       ├── cli.ts               # Spawns the built CLI binary as a child process (CliProcess)
│       └── web.ts               # Drives a real Playwright/Chromium session against the deployed web app
├── utils/
│   ├── config.ts                # baseURL/apiURL/timeouts; re-exports getTestToken() from @shared/tests/token
│   └── cli-process.ts           # Child-process wrapper: spawn, waitFor(regex), kill
├── .env / .env.example
├── tsconfig.json
└── vitest.e2e.config.mts
```

## Key Patterns

### Actors (`e2e/actors/`)
Both actors implement the same `DropActor`/`GrabActor` interface (`drop(secret) → {id, link}`, `grab(id) → secret`, `dispose()`), so `cross-platform.spec.ts` can mix and match them generically. When adding a third platform (e.g. `vscode-extension`), implement the same interface rather than special-casing the spec.

- **CLI actor**: spawns `cli/dist/deadrop.js` as a child process and scrapes stdout for the drop link / grabbed secret via regex (`CliProcess.waitFor`). Requires `pnpm test:e2e` (not `:run`) so the binary is freshly built.
- **Web actor**: launches a real headless Chromium via `playwright` and drives the deployed web app's DOM directly — element IDs (`#begin-drop-btn`, etc.) are copied from `web/lib/constants.ts` rather than imported, since pulling in the web tsconfig isn't worth it for a handful of string constants. If those IDs change in `web/`, update them here too.

### Test-token bypass
Both actors authenticate past captcha/rate-limiting using the same stable `DROP_TEST_TOKEN`/`test_tkn` KV-backed mechanism as `web/tests/e2e/` and `cli/tests/e2e/` — see `shared/tests/http.ts` for the cookie/header constant names. This is a test-only bypass; never reuse it for anything user-facing. The value is rotated daily by `.github/workflows/hydrate_test_token_workflow.yml` (`pnpm hydrate:test-token`, runs `shared/scripts/hydrate-test-token.ts`) rather than seeded per test run — its concurrency group queues behind any in-flight e2e workflow so rotation never lands mid-run.

### XPLAT_ env namespacing
Vite/Vitest reserves `BASE_URL` for its own base public path, so the deployed app URL is namespaced as `XPLAT_BASE_URL` to avoid the collision. Follow the same `XPLAT_*` prefix for any new env var this suite introduces.

## Important Constraints

- This suite targets a **live deployment**, not localhost — it is the one place in the repo that asserts cross-platform interop, so don't weaken it into another single-platform smoke test
- Keep actors thin: platform-driving mechanics only, no assertions — `roundTrip()` in `harness.ts` owns the pass/fail logic
- `fileParallelism: false` / `singleFork: true` in `vitest.e2e.config.mts` is intentional — real browsers and WebRTC peers are resource-heavy and flaky under parallel load
