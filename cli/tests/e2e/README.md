# CLI e2e tests (Vitest)

CLI-to-CLI mirror of the web drop/grab e2e. Two `deadrop` processes establish
a real `node-datachannel` WebRTC connection: one drops a text secret, the other
grabs it, and we assert the round-tripped value. See
`../../../cli-e2e-test-suite-plan.md` for the roadmap (M1→M3).

## How it works

- **Runner:** Vitest (`cli/vitest.e2e.config.mts`), same runner as the rest of
  the repo. No browser is involved here. For the M3 cross-platform matrix,
  Vitest's browser mode loads Playwright as its provider, so one runner drives
  both the CLI (node) and browser actors; the actor helpers below are
  runner-agnostic, so they carry straight over.
- **Actors:** `util.ts` exposes `dropCli(secret)` and `grabCli(id)`. `dropCli`
  spawns `node dist/deadrop.js drop <secret>`, parses the grab link from stdout
  (`?drop=<id>`), and keeps the process alive. `grabCli` spawns `grab <id>` and
  resolves with the secret scraped from the grabber's `Secret: <value>` line.
  Each spawned process is registered with `onTestFinished` and killed when the
  test ends.
- **Token bypass:** like web, `global-setup` seeds a one-hour token into Redis.
  The dropper sends it as `Cookie: test-tkn=<token>` (a cookie is just a
  request header, and Node/Bun fetch both send a manually-set `Cookie`), so the
  worker's existing `getCookie` path accepts it with **no worker change**.

## Running

Targets a **deployed** worker (same philosophy as web e2e). No worker change is
involved, so the currently deployed worker works as-is; the token just has to
be seeded into the **same** Upstash that worker reads.

```bash
DEADROP_API_URL=https://<worker-url> \
REDIS_REST_URL=<upstash-url> \
REDIS_REST_TOKEN=<upstash-token> \
pnpm -F cli test:e2e
```

`test:e2e` builds the CLI (`dist/deadrop.js`) first, then runs
`vitest run -c vitest.e2e.config.mts`. Point at the bun binary instead with
`CLI_ENTRY=/path/to/binary`.

## Notes / gotchas

- **Run on macOS.** Two local WebRTC peers cannot complete ICE in the GitHub
  Linux container (same constraint the web suite documents). The CLI drop→grab
  spec is the canary if the runner changes.
- **Assert on stdout, not process lifetime.** The grab path calls
  `process.exit()` immediately after logging the secret, so the actor resolves
  on the `Secret:` line via the stream `close` event (which fires after stdio
  flushes). Exit code is meaningful now (0 = verified grab), but we still read
  the value from stdout.
- **Serial only** (single fork, no file parallelism). The drop token is a
  single shared Redis key and WebRTC peers are chatty; one flow at a time keeps
  M1 deterministic.

## Files

- `vitest.e2e.config.mts` (package root) — standalone e2e config (run via `-c`
  so the unit config and root workspace ignore these specs).
- `config.ts` — `apiURL`, `cliEntry`, timeouts.
- `redis.ts` — Upstash client (copied from `web/api/redis.ts`; M2 will lift).
- `global-setup.ts` — Vitest globalSetup: seeds the token, returns the teardown
  that deletes it.
- `util.ts` — `CliProcess`, `dropCli`/`grabCli`, token helper.
- `cli-drop-flow.spec.ts` — the M1 spec.
