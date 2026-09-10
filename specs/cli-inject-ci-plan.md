# Implementation plan: CI token minting + `deadrop inject --github-env`

> Execution plan for `specs/cli-inject-command.md` (the "this session's
> scope" parts — Status section marks what's already built vs. new). Read
> that spec in full before starting; it has the exact code for every file
> below. This plan just orders the work and gives verification checkpoints
> between phases so problems surface early rather than at the end.
>
> This file is a working document, not a committed spec — do not `git add`
> or commit it.

Work top-down — later phases depend on earlier ones (CLI code calls the new
worker route; tests depend on the implementation existing).

**First thing to check in this worktree:** `cli/lib/auth/clerk.ts`,
`worker/src/lib/middleware.ts`, and `worker/src/routers/vault.ts` should
already have uncommitted foundation changes applied (API-key auth fallback,
`allowApiKey` support) — `git status` should show them modified. Commit
those first, on their own, before starting Phase 1 (Phase 1 rewrites part of
`vault.ts` again, so get the foundation change committed as a clean base
first rather than folding it into the same commit).

## Phase 1 — Worker: status-aware Turso errors + `/vault/tokens`

1. `shared/lib/turso/client.ts` — add `TursoApiError`, replace the plain
   `Error` throw in `request()` with it.
2. `shared/lib/turso/index.ts` — export `TursoApiError`.
3. `worker/src/constants.ts` — rename `AppRouteParts.Share` → `Tokens`,
   `AppRoutes.ShareVault` → `VaultTokens` (confirmed dead code, no other
   caller to update).
4. `worker/src/routers/vault.ts` — delete the `POST /vault/share` handler,
   add `POST /vault/tokens` per the spec (optional `name`, parallel
   `getVault`/`createVaultToken`, 404 vs 500 branching on `TursoApiError`).
5. Check `worker/CLAUDE.md`'s route table — update the `/vault/share` row
   to `/vault/tokens` with the new description.

**Checkpoint:** `pnpm -F worker test` passes. If a test file already covers
the old `/vault/share` route, it needs rewriting for `/vault/tokens` here —
don't leave a stale test asserting the deleted route.

## Phase 2 — Shared types

1. `shared/types/config.ts` — `CloudVaultConfig.authToken` → optional.
2. Grep every reader of `CloudVaultConfig.authToken` (`cli/db/init.ts`,
   `shared/db/init.ts`, `cli/actions/vault/export.ts`, `sync.ts`, any
   others) and confirm none of them assume it's always present in a way
   that would now produce a wrong type error or silent `undefined` bug.
   `initDBConfig` already conditionally spreads `cloudConfig` as a whole, so
   this should be a no-op change for existing call sites — verify, don't
   assume.

**Checkpoint:** `pnpm -F cli exec tsc --noEmit` (or the repo's usual
type-check command) is clean.

## Phase 3 — CLI: new lib files

1. `cli/lib/auth/vault-token.ts` (new) — `mintVaultToken` +
   `VaultNotFoundError`, per spec.
2. `cli/lib/github-env.ts` (new) — `writeGithubEnv`, per spec.

These have no dependents yet (Phase 4 wires them in) — safe to write and
unit-test in isolation first.

**Checkpoint:** write `cli/tests/unit/github-env.spec.ts` now (spec's test
#13) since `writeGithubEnv` has no other dependencies — confirms the
delimiter/masking format before it's wired into `inject.ts`.

## Phase 4 — CLI: rewrite `inject.ts` + registration

1. `cli/actions/inject.ts` — full rewrite per spec (`resolveVault` +
   rewritten `inject`). Pay attention to the guard-condition note in the
   spec (`!cloud || !cloud.authToken || options.refreshToken` — easy to
   get subtly wrong).
2. `cli/core.ts` — update the `inject` command registration
   (`[command...]`, `--refresh-token`, `--github-env` options).

**Checkpoint:** manually run through spec Verification steps 1-7 locally
(build, real vault, token refresh, `DEADROP_API_KEY` fallback, config-free
mode). These need a real Clerk API key and a real vault — use whatever
sandbox/dev credentials are already set up for this repo's local dev
(check `cli/CLAUDE.md`/`.env.example` if unsure which vars are needed:
`DEADROP_API_URL`, `TURSO_ORGANIZATION`, etc.).

## Phase 5 — `cli/install.sh` fix

1. Apply the non-interactive/no-tty guard per spec (purely additive).

**Checkpoint:** run the script locally in an interactive shell first to
confirm the prompt still appears normally (`[ -t 1 ]`/`[ -r /dev/tty ]`
both true). Then simulate non-interactive: `CI=true bash install.sh` (or
run it inside a script with no controlling tty) and confirm it completes
without prompting.

## Phase 6 — Tests

1. Extend `cli/tests/unit/inject.spec.ts` with spec tests #6-12
   (config-free resolution, default-vault-no-name, mint-on-missing-token,
   `--refresh-token`, `VaultNotFoundError`, `--github-env` happy path,
   `--github-env` guards).
2. Add/extend worker vault router tests for `POST /vault/tokens` (spec test
   #14) — find the existing test file first (`worker/tests/` or similar);
   don't create a second one if vault router tests already exist somewhere.

**Checkpoint:** `pnpm -F cli test` and `pnpm -F worker test` both green.

## Phase 7 — Docs

1. `web/pages/docs/features/cli.mdx` — add the CI/CD section per spec,
   including the explicit callout about which two values are secrets vs.
   plain config.

**Checkpoint:** skim-render the MDX locally if the web app's docs pipeline
is easy to spin up (`pnpm start` → `/docs/features/cli`); otherwise at
least confirm the MDX parses (no broken code-fence/frontmatter) by eye.

## Phase 8 — Final pass

1. Re-read the full diff against `specs/cli-inject-command.md` — confirm
   every "Files → Modified/New" entry in the spec has a corresponding
   change, and nothing drifted from what was specified without a good
   reason.
2. Run the full verification list in the spec (steps 1-10) end to end at
   least once, including the actual GitHub Actions run (step 8) if a
   throwaway workflow/branch can be pushed for it — flag to the user if
   that step needs to wait for a PR to exist rather than running locally.
3. `pnpm -F cli test`, `pnpm -F worker test`, and any repo-wide lint/format
   check one more time before considering this done.
4. Delete this plan file (`specs/cli-inject-ci-plan.md`) once implementation
   is complete and verified — it's a working document, not a permanent
   spec; `specs/cli-inject-command.md` remains as the durable record.

## Notes for whoever runs this

- `specs/cli-inject-command.md` has the actual code for every change above
  — this plan is deliberately light on code and heavy on ordering/
  verification so it doesn't drift out of sync with the spec if the spec
  gets touched up later. If something here contradicts the spec, the spec
  wins.
- Don't add scope beyond what's in the spec's "In scope" list — the
  "Follow-ups" section exists specifically to catch "while I'm in here..."
  ideas. Note them there if new ones come up, don't build them.
- If any phase's checkpoint fails in a way that suggests the spec itself
  was wrong (not just an implementation slip), stop and flag it rather than
  quietly deviating — this plan was reviewed and approved as written.
