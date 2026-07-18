# Cross-platform e2e — design & handoff spec

Goal: one parametrized suite that runs the deadrop drop/grab flow across every
**actor** pairing — `cli→cli`, `cli→web`, `web→cli`, `web→web` — over real
WebRTC against the **deployed** worker + web app. The headline case is
**drop from the CLI, grab in a browser** (and the reverse).

This doc gives the foundation (already-decided architecture + scaffolding code)
and a case matrix. **Implementer task:** flesh out the case matrix in
`§7`, following the worked example in `§6`. Do not redesign the harness.

---

## 1. Architecture (decided — do not change)

A **Node Vitest test that drives Playwright as a library** (`import { chromium }
from 'playwright'`) plus `child_process` for the CLI. Both actors are
orchestrated from Node, against deployed targets.

Why not Vitest browser mode: browser mode runs the test *inside* a
Vitest-controlled page and is for testing locally-rendered code. Our web actor
must navigate a browser to the **remote, cross-origin** deployed app, where no
Vitest client is injected — that's the Node-drives-browser-externally model,
i.e. Playwright-as-a-library. (CLI spawning would be fine in browser mode via
`server.commands`; remote navigation is the real blocker.)

This leaves `web_ci` (Playwright test runner) and `cli_e2e` untouched. This is
the additive `e2e_ci` suite.

## 2. Package & files

Lives in the **`tests/` workspace package** (already created: `tests/package.json`
name `tests`, listed in `pnpm-workspace.yaml`). One package, suite-type folders.
Cross-suite helpers go in `utils/` (integration will reuse them); the e2e
actors/specs go in `e2e/`. Vitest configs sit at the package **root** (so
`root` + dotenv cwd resolve to `tests/` cleanly); specs live in the folders.

```
tests/
├── package.json            # name "tests"; deps: vitest, playwright, execa
├── tsconfig.json           # extends root; paths @shared/*, @api/*; allow web import
├── vitest.e2e.config.mts   # node env, single fork, setupFiles ['dotenv/config'], include e2e/**/*.spec.ts
├── .env                    # local: BASE_URL, DEADROP_API_URL, DROP_TEST_TOKEN, PEER_SERVER_URL, TURN_*
├── utils/                  # cross-suite (integration reuses) — NOT e2e-specific
│   ├── config.ts           # resolved env/targets/token (§5a)
│   └── cli-process.ts      # execa-based CliProcess (§4)
├── e2e/
│   ├── actors/
│   │   ├── types.ts        # DropActor / GrabActor interfaces (§5b)
│   │   ├── cli.ts          # CliDropActor / CliGrabActor (§5c)
│   │   └── web.ts          # WebDropActor / WebGrabActor (§5d)
│   ├── harness.ts          # actor registries + matrix helper (§5e)
│   └── cross-platform.spec.ts   # the matrix spec (§6, §7)
└── integration/            # LATER — own vitest.integration.config.mts at root, reuses ../utils
```

`tests/package.json` scripts:
```json
{
  "scripts": {
    "test:e2e": "pnpm -F cli build && vitest run -c vitest.e2e.config.mts"
  }
}
```
(The CLI binary must be built before the run; the web side hits the deployed
app, nothing to build there.)

## 3. Targets & env

Same philosophy as the other suites: **deployed**.

| Var | Meaning |
|---|---|
| `BASE_URL` | deployed web app (e.g. `https://alpha.deadrop.io/`) |
| `DEADROP_API_URL` | deployed worker |
| `PEER_SERVER_URL` | signaling (baked into the CLI build; needed for `pnpm -F cli build`) |
| `TURN_USERNAME` / `TURN_PWD` | CLI runtime ICE creds |
| `DROP_TEST_TOKEN` | stable drop test token (cookie for web, env for CLI) — bypasses captcha/rate-limits |

The token is the **stable persistent value** (already in Redis under `test_tkn`,
repo secret + `cli/.env`). Read it; never seed or delete it.

## 4. Reuse (don't reinvent)

- **CLI process control:** port `CliProcess` from `cli/tests/e2e/util.ts` (an
  `execa`-based class: `execa(...)` with `reject:false`/`buffer:false`, a
  `waitFor(regex, timeout)` that matches the streamed stdout and settles on the
  execa promise when the process ends). Copy it into `tests/utils/cli-process.ts`
  (≈60 lines) — cross-suite, so it lives in `utils/`, not the e2e actors. The
  cross-package import from `cli/` isn't worth it. Add `execa` to `tests/` deps.
- **Web selectors + cookie setup:** the DOM ids and cookie names already exist.
  - ids: `BEGIN_DROP_BTN_ID`, `CONFIRM_PAYLOAD_BTN_ID`, `DROP_LINK_ID`,
    `DROP_SECRET_VALUE_ID` from `web/lib/constants`, plus `begin-grab-btn`
    (string literal in `web/tests/e2e/drop-flow.spec.ts`).
  - cookies: `TEST_TOKEN_COOKIE`, `TEST_FLAG_COOKIE` from `@shared/tests/http`.
  - cookie pattern: set `test_tkn=DROP_TEST_TOKEN` on **both** `BASE_URL` and
    `DEADROP_API_URL`, plus the `test-mode` flag — mirror
    `web/tests/e2e/util.ts:createContextForBrowser`.
- **Link → id:** `new URL(link).searchParams.get('drop')`.

## 5. Foundation code (copy in as-is)

### 5a. `utils/config.ts`
```ts
import path from 'path';
import { fileURLToPath } from 'url';

// ESM-safe __dirname (config.ts lives at tests/utils/, so ../../ is the repo root)
const here = path.dirname(fileURLToPath(import.meta.url));

const raw = process.env.BASE_URL || 'https://alpha.deadrop.io/';
export const baseURL = raw.endsWith('/') ? raw : `${raw}/`;
export const apiURL = process.env.DEADROP_API_URL!;
export const cliEntry =
  process.env.CLI_ENTRY ||
  path.join(here, '..', '..', 'cli', 'dist', 'deadrop.js');
export const dropTimeout = Number(process.env.XPLAT_DROP_TIMEOUT || 45_000);
export const grabTimeout = Number(process.env.XPLAT_GRAB_TIMEOUT || 45_000);

export const testToken = (): string => {
  const t = process.env.DROP_TEST_TOKEN;
  if (!t) throw new Error('DROP_TEST_TOKEN not set');
  return t;
};
```

### 5b. `e2e/actors/types.ts`
```ts
// A drop actor performs a drop and STAYS ALIVE (peer connected) until the
// grabber finishes; dispose() tears it down. A grab actor grabs by id and
// returns the decrypted secret.
export interface DropActor {
  readonly kind: 'cli' | 'web';
  drop(secret: string): Promise<{ id: string; link: string }>;
  dispose(): Promise<void>;
}
export interface GrabActor {
  readonly kind: 'cli' | 'web';
  grab(id: string): Promise<string>; // decrypted secret
  dispose(): Promise<void>;
}
```

### 5c. `e2e/actors/cli.ts`
```ts
import { CliProcess } from '../../utils/cli-process'; // ported from cli/tests/e2e/util.ts
import {
  testToken, apiURL, cliEntry, dropTimeout, grabTimeout,
} from '../../utils/config';

const cliEnv = () => ({
  DEADROP_API_URL: apiURL,
  TEST_TOKEN: testToken(),   // logic/drop.ts reads TEST_TOKEN → sends the cookie
  // PEER_SERVER_URL/TURN_* are baked at build / inherited from process.env
});

export const cliDropActor = (): DropActor => {
  let proc: CliProcess | null = null;
  return {
    kind: 'cli',
    async drop(secret) {
      proc = new CliProcess(['drop', secret], cliEnv());
      const m = await proc.waitFor(/grab\?drop=([^\s&]+)/, dropTimeout);
      return { id: m[1], link: m[0] };
    },
    async dispose() { proc?.kill(); },
  };
};

export const cliGrabActor = (): GrabActor => {
  let proc: CliProcess | null = null;
  return {
    kind: 'cli',
    async grab(id) {
      proc = new CliProcess(['grab', id], { DEADROP_API_URL: apiURL });
      const m = await proc.waitFor(/Secret:\s*(.+)/, grabTimeout);
      return m[1].trim();
    },
    async dispose() { proc?.kill(); },
  };
};
```

### 5d. `e2e/actors/web.ts` (Playwright library)
```ts
import { chromium, Browser } from 'playwright';
import { TEST_TOKEN_COOKIE, TEST_FLAG_COOKIE } from '@shared/tests/http';
import {
  BEGIN_DROP_BTN_ID, CONFIRM_PAYLOAD_BTN_ID, DROP_LINK_ID, DROP_SECRET_VALUE_ID,
} from '../../../web/lib/constants';
import {
  baseURL, apiURL, testToken, dropTimeout, grabTimeout,
} from '../../utils/config';

const newPage = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ bypassCSP: true });
  await ctx.addCookies([
    { name: TEST_TOKEN_COOKIE, value: testToken(), url: apiURL,  sameSite: 'None', httpOnly: true, secure: true },
    { name: TEST_TOKEN_COOKIE, value: testToken(), url: baseURL, sameSite: 'None', httpOnly: true, secure: true },
    { name: TEST_FLAG_COOKIE,  value: 'true',      url: baseURL, sameSite: 'Strict', httpOnly: false, secure: true },
  ]);
  return { browser, page: await ctx.newPage() };
};

export const webDropActor = (): DropActor => {
  let browser: Browser | null = null;
  return {
    kind: 'web',
    async drop(secret) {
      const h = await newPage(); browser = h.browser; const { page } = h;
      await page.goto(new URL('/drop', baseURL).toString());
      await page.locator(`#${BEGIN_DROP_BTN_ID}`).click();
      await page.getByPlaceholder('Your secret').fill(secret);
      await page.locator(`#${CONFIRM_PAYLOAD_BTN_ID}`).click();
      const link = await page.locator(`#${DROP_LINK_ID}`).getAttribute('href', { timeout: dropTimeout });
      return { id: new URL(link!).searchParams.get('drop')!, link: link! };
    },
    async dispose() { await browser?.close(); },
  };
};

export const webGrabActor = (): GrabActor => {
  let browser: Browser | null = null;
  return {
    kind: 'web',
    async grab(id) {
      const h = await newPage(); browser = h.browser; const { page } = h;
      await page.goto(new URL(`/grab?drop=${id}`, baseURL).toString());
      await page.locator('#begin-grab-btn').click();
      const v = page.locator(`#${DROP_SECRET_VALUE_ID}`);
      await v.waitFor({ state: 'visible', timeout: grabTimeout });
      return (await v.innerText()).trim();
    },
    async dispose() { await browser?.close(); },
  };
};
```

### 5e. `e2e/harness.ts`
```ts
export const dropActors = { cli: cliDropActor, web: webDropActor };
export const grabActors = { cli: cliGrabActor, web: webGrabActor };

// Runs one drop→grab round-trip with the given actor factories and asserts the
// secret survives. dropper stays alive until grab finishes; both disposed after.
export const roundTrip = async (
  makeDrop: () => DropActor, makeGrab: () => GrabActor, secret: string,
) => {
  const dropper = makeDrop(); const grabber = makeGrab();
  try {
    const { id } = await dropper.drop(secret);
    return await grabber.grab(id);
  } finally {
    await grabber.dispose(); await dropper.dispose();
  }
};
```

## 6. Worked example — the canonical spec body

```ts
import { test, expect } from 'vitest';
import { dropActors, grabActors, roundTrip } from './harness';

// The full 4-way matrix for a basic text secret.
for (const [dn, makeDrop] of Object.entries(dropActors))
  for (const [gn, makeGrab] of Object.entries(grabActors))
    test(`text secret: drop:${dn} -> grab:${gn}`, async () => {
      const secret = `xplat ${dn}->${gn} ${Date.now()}`; // UNIQUE per test
      const got = await roundTrip(makeDrop, makeGrab, secret);
      expect(got).toBe(secret);
    });
```

This one block already yields the four pairings, including the headline
`cli→web` and `web→cli`.

## 7. Case matrix to flesh out (implementer)

Each case = a `roundTrip` (or direct actor calls) asserting the payload
survives, run across the **same 4-way `for×for` matrix** as §6 unless noted.
Use the helper; keep one unique secret per test.

| # | Case | Notes |
|---|---|---|
| 1 | **Basic text** (done in §6) | the template |
| 2 | **Unicode / emoji** | `'héllo 🌍 secret'` — verifies encoding survives cookie + CLI arg + crypto |
| 3 | **Multi-line text** | embedded `\n`; confirm the CLI `Secret:` parser handles only the first line, or assert via a hash instead (see gotchas) |
| 4 | **Special chars** | quotes, `$`, backticks, spaces — stress CLI arg + web fill |
| 5 | **Long payload near cap** | ~15KB (cap is 16KB, `@shared/config/files`); just under |
| 6 | **Over-cap rejection** | >16KB → expect the dropper to reject; assert the error, not a round-trip (drop-side only) |
| 7 | **Invalid grab id** | `grabber.grab('does-not-exist')` → expect failure (CLI non-zero/err line; web error state). grab-side only |
| 8 | **One-time grab** | drop once, grab twice → second grab fails (drop consumed). May need two grab actors against one dropper |
| 9 | **(stretch) File drop** | CLI `drop -f <path>` vs web file upload → grab to file/text. Only meaningful for some pairings; scope last |

For 6/7/8 you assert **failure modes**, so don't use `roundTrip` blindly — call
the actors directly and `expect(...).rejects` / inspect output. Add small
`expectDropRejected` / `expectGrabFailed` helpers in `harness.ts` if it reduces
repetition.

## 8. Conventions & gotchas

- **Unique secret per test** (timestamp/random). Drops are one-time; never share.
- **Dispose order:** grabber then dropper, always in `finally`. Never dispose the
  dropper before the grab completes — it kills the peer.
- **Chromium only** for the web actor. WebKit cross-browser WebRTC is disabled
  (issue #97); Firefox is unnecessary noise here.
- **Run serial** (single fork, `fileParallelism: false`). Real browsers + WebRTC
  peers are resource-heavy; the stable token removed the *only* reason they had
  to serialize, but resource pressure still argues for it.
- **Timeouts:** 45–90s per test; WebRTC + cold browser launch is slow.
- **macOS runner only** in CI — two WebRTC peers can't complete ICE in the GH
  Linux container (same constraint as the other suites).
- **Multi-line + CLI grab:** the CLI prints `Secret: <value>` on one line, so the
  `Secret:\s*(.+)` parser captures only the first line. For multi-line payloads,
  either assert a SHA-256 of the round-tripped value, or scope multi-line to
  web-grab pairings. Decide per case; note it in the test.
- **Don't** touch the token in Redis, `web_ci`, the worker, or `cli_e2e`.

## 9. CI wiring (`.github/workflows/e2e_ci_workflow.yml`)

The additive cross-platform workflow (separate from `cli_e2e` and `web_ci`):

- **Triggers:** `deployment_status` (compat check once a web deploy finishes) +
  `push` on `cli/**`,`shared/**` + `pull_request` to main/alpha +
  `workflow_dispatch`.
- **Runner:** `macos-latest` with **`node-version: 22`**. Do **not** use node
  24 — it hangs Playwright's browser install on the macOS runner (chromium
  downloads to 100%, then the step stalls silently to the 20-min job timeout).
  `web_ci` is pinned to 22 for exactly this reason; match it.
- **Browser install:** `pnpm exec playwright install chromium` — **no
  `--with-deps`**. That flag installs OS-level libs (a Linux/apt concern); on
  macOS the browser is self-contained and it's just another place to hang.
- **URL resolution — reuse, don't reinvent.** Copy the branch-resolution +
  skip-superseded + `concurrency` block from `web_ci_workflow.yml` verbatim and
  adapt. The rules:
  - `deployment_status`: resolve `event.deployment.sha` via the GitHub
    `branches-where-head` API. Head of `alpha` → `alpha.deadrop.io`; head of
    another branch → that deploy's preview `target_url`; **head of nothing →
    skip (`exit 0`)** — it's a superseded deploy and only has a protected
    preview URL.
  - `push` / `pull_request`: use the stable branch domain
    (`alpha.deadrop.io` / `deadrop.io`).
  - `concurrency: group: ${{ github.workflow }}-${{ github.event.deployment.environment || github.ref }}`, `cancel-in-progress: true` — cancels superseded runs (mirrors web_ci).
- **Env (all repo secrets):** `BASE_URL` (resolved per event),
  `DEADROP_API_URL`, `PEER_SERVER_URL`, `TURN_USERNAME`, `TURN_PWD`,
  `DROP_TEST_TOKEN`.
- **Steps:** checkout → `pnpm/action-setup@v6` → `setup-node@v6` (node 22, pnpm
  cache) → `pnpm install --frozen-lockfile` → `pnpm exec playwright install
  chromium` → `pnpm -F tests test:e2e`.

## 10. Definition of done

- §6 matrix green across all four pairings against the deployed targets, on
  macOS, locally and in CI.
- Cases 1–8 implemented (9 optional). Failure cases assert the failure, not a
  round-trip.
- No changes to `cli_e2e`, `web_ci`, the worker, or the token in Redis.
```
