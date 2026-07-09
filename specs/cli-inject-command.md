# Spec: `deadrop inject` CLI command

> Self-contained build spec for a single Claude Code session (sized for Haiku or Sonnet at
> medium effort). Builds the `deadrop inject` subcommand. A GitHub Action that wraps this
> command is a deliberate follow-up, not part of this session.

## Context

deadrop vaults hold secrets encrypted client-side (Turso-synced, server never sees plaintext).
Today the only way to get them into a process is `deadrop vault export`, which writes a `.env`
file to disk — a plaintext artifact that lingers and has to be cleaned up. For CI/CD and local
dev we want to run a command with the vault's secrets injected directly into its environment,
with no file on disk.

`specs/pricing-tiers.md` (§"Inject flow (CI-side, `deadrop inject -- pnpm build`)" and
"Future Work") specifies this command: `deadrop inject -- <cmd>` pulls the vault, decrypts
locally, injects env vars into a wrapped child process, and tears down on exit. It is listed
as not-yet-built. This session builds it.

This is the prerequisite for a future `deadrop-inject` GitHub Action: the action will be a thin
wrapper that downloads the already-published `deadrop` binary (see `cli_publish_workflow.yml`)
and calls `deadrop inject`, so no compiled bundle ever needs committing. That action is out of
scope here — see "Follow-ups".

## Scope

**In scope:** the `deadrop inject [options] -- <command...>` subcommand, reusing the existing
config-load + cloud-sync + decrypt path. Works against any vault the config already describes
(local, or cloud-synced via the Turso token already stored in config) — `deadrop login` is not
required when the config is complete (the CI case).

**Out of scope (document as follow-ups, do not build):**
- Worker `/service-tokens/exchange` + short-lived Turso token exchange (v1 uses the long-lived
  token already in the vault config; note the hardening path).
- Tier/feature gating (`ci_tokens`) — the plan-claims plumbing isn't in the CLI yet.
- The GitHub Action wrapper and any `--github-env`/`::add-mask::` output mode.

## Command design

```
deadrop inject [options] -- <command...>

Run <command> with the active (or selected) vault's secrets injected as environment
variables. Secrets are decrypted in-memory and never written to disk.

Options:
  -v, --vault <name>          vault to inject (default: config active_vault.name)
  -e, --environment <env>     environment to inject (default: config active_vault.environment)
  -c, --config <path>         load an explicit config file (JSON or YAML) instead of the
                              auto-discovered .deadroprc — the bridge for CI / the future action
      --no-override           let pre-existing process env vars win over vault values
                              (default: vault values override process env)
      --verbose               log injected variable NAMES (never values)

Examples:
  deadrop inject -- pnpm build
  deadrop inject -v prod -e production -- node server.js
  deadrop inject --config ./deadrop-ci.json -- ./deploy.sh
```

### `--` separator (Commander semantics — important)
Register the command with a variadic argument: `.argument('<command...>', '…')`. Commander
treats everything after a standalone `--` as positional operands (not parsed as deadrop
options), so `deadrop inject -v prod -- pnpm build --watch` parses `{ vault: 'prod' }` and
passes `['pnpm','build','--watch']` to the action — the child's own `--watch` flag is safe.
Require the `--`; if `command` is empty, error out with usage and exit 1.

### Env merge + exit semantics
- Default (`override` true): child env = `{ ...process.env, ...secrets }` (vault wins).
- `--no-override`: `{ ...secrets, ...process.env }` (existing env wins).
- Spawn with `stdio: 'inherit'`, `shell: false` (no shell-injection surface; users needing
  shell features run `-- sh -c "…"`).
- Forward `SIGINT`/`SIGTERM`/`SIGHUP` to the child; wait for it to exit, then exit the CLI with
  the child's exit code (or `128 + signal` if it was signalled). ENOENT (command not found) →
  clear error, exit 127.
- Never log secret values. Log only a count by default; `--verbose` adds names.

## Files

### New
- `cli/actions/inject.ts` — the `inject(command: string[], options: InjectOptions)` handler.
  Mirrors `cli/actions/vault/export.ts` for load+decrypt, then spawns instead of writing a file.
  ```ts
  import { initDBClient } from 'db/init';
  import { createSecretsHelpers } from '@shared/db/secrets';
  import { loadConfig, loadConfigFromPath } from 'lib/config';
  import { runWithEnv } from 'lib/process';
  import { logError, logInfo } from 'lib/log';

  type InjectOptions = {
    vault?: string;
    environment?: string;
    config?: string;
    override: boolean;   // commander sets this false when --no-override is passed
    verbose?: boolean;
  };

  export async function inject(command: string[], options: InjectOptions) {
    if (!command?.length) {
      logError('No command provided. Usage: deadrop inject -- <command>');
      process.exit(1);
    }

    const { config } = options.config
      ? await loadConfigFromPath(options.config)
      : await loadConfig();

    const vaultName = options.vault ?? config.active_vault.name;
    const environment =
      options.environment ?? config.active_vault.environment;

    const vault = config.vaults[vaultName];
    if (!vault) {
      logError(`Vault '${vaultName}' not found in config.`);
      process.exit(1);
    }

    const db = await initDBClient(vault.location, vault.cloud);
    const { getAllSecrets } = createSecretsHelpers(vault, db);
    const secrets = await getAllSecrets(environment);

    const names = Object.keys(secrets);
    logInfo(
      `Injecting ${names.length} secret(s) from '${vaultName}' (${environment})`,
    );
    if (options.verbose && names.length)
      logInfo(`Variables: ${names.join(', ')}`);

    const [cmd, ...args] = command;
    let exitCode = 0;
    try {
      exitCode = await runWithEnv(cmd, args, secrets, {
        override: options.override,
      });
    } finally {
      db.$client.close();
    }
    process.exit(exitCode);
  }
  ```
- `cli/lib/process.ts` — `runWithEnv` child-process helper (separate for unit-testability).
  ```ts
  import { spawn } from 'child_process';

  const FORWARDED: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];

  export function runWithEnv(
    cmd: string,
    args: string[],
    secrets: Record<string, string>,
    { override = true }: { override?: boolean } = {},
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      const env = override
        ? { ...process.env, ...secrets }
        : { ...secrets, ...process.env };

      const child = spawn(cmd, args, {
        env,
        stdio: 'inherit',
        shell: false,
      });

      const forward = (sig: NodeJS.Signals) => child.kill(sig);
      FORWARDED.forEach((s) => process.on(s, forward));
      const cleanup = () =>
        FORWARDED.forEach((s) => process.off(s, forward));

      child.on('error', (err: NodeJS.ErrnoException) => {
        cleanup();
        if (err.code === 'ENOENT') {
          reject(new Error(`Command not found: ${cmd}`));
        } else reject(err);
      });

      child.on('exit', (code, signal) => {
        cleanup();
        if (signal)
          resolve(128 + (require('os').constants.signals[signal] ?? 0));
        else resolve(code ?? 0);
      });
    });
  }
  ```
- `cli/tests/unit/inject.spec.ts` — see Testing.

### Modified
- `cli/core.ts` — register the command (place after `grab`, before the vault group):
  ```ts
  import { inject } from 'actions/inject';

  deadrop
    .command('inject')
    .description('run a command with vault secrets injected as env vars')
    .argument('<command...>', 'command to run (after --)')
    .option('-v, --vault <name>', 'vault to inject')
    .option('-e, --environment <env>', 'environment to inject')
    .option('-c, --config <path>', 'explicit config file (JSON or YAML)')
    .option('--no-override', 'let existing env vars win over vault values')
    .option('--verbose', 'log injected variable names (never values)')
    .action(inject);
  ```
- `cli/lib/config.ts` — add `loadConfigFromPath` (explicit-file loader for `--config`, the CI
  bridge). Returns the same `{ config }` shape as `loadConfig`. Parse `.json` via `JSON.parse`,
  otherwise YAML (`parse` from `yaml`, already a dep). Validate it has `active_vault` + `vaults`;
  `logError` + exit 1 if malformed or missing.
- `cli/CLAUDE.md` — add `deadrop inject` to the command list.

### Spec/doc
- Update `specs/pricing-tiers.md` "Future Work" to note `deadrop inject` is built and what
  remains (service-token exchange, action wrapper, tier gating).

## Reused code (do not reimplement)
- `loadConfig` — `cli/lib/config.ts:18`
- `initDBClient(location, cloud)` — `cli/db/init.ts` (does the libSQL local-file +
  cloud-replica sync; whatever works for `vault export`/`sync` works here unchanged)
- `createSecretsHelpers(vault, db).getAllSecrets(environment)` — `shared/db/secrets.ts:65`
  (queries the `secrets` table and decrypts each row via `unwrapSecret`)
- `logInfo` / `logError` — `cli/lib/log`
- The whole load+decrypt sequence is copied from `cli/actions/vault/export.ts`.

## Notes / gotchas for the implementer
- The handler signature is `(command: string[], options)` because of the variadic
  `<command...>` argument — Commander passes the variadic as the first action param.
- `--no-override` makes Commander populate `options.override = false` (camelCased, negated).
  Type `InjectOptions.override` as required `boolean`.
- Do NOT delete any DB file on teardown — `vault.location` may be the user's real persistent
  vault. Teardown is just `db.$client.close()`. (Ephemeral CI replica cleanup is the runner's
  job, handled later by the action.)
- `formatCloudSyncUrl` (`shared/lib/util.ts`) reads `process.env.TURSO_ORGANIZATION`; cloud
  inject inherits the same requirement/behavior as `vault export`. Don't try to "fix" sync here
  — keep parity with export. Flag in the follow-ups that the CI config may need to carry a
  resolved sync URL so the action doesn't depend on that env var.
- Prettier: 70-char width, single quotes, semicolons, trailing commas (`.prettierrc`).

## Testing (`cli/tests/unit/inject.spec.ts`, vitest)
1. **Real env-injection round-trip (no mocks) — the key test.** Call `runWithEnv('node',
   ['-e', 'process.exit(process.env.FOO === "bar" ? 0 : 7)'], { FOO: 'bar' })` and assert it
   resolves `0`; with `{ FOO: 'nope' }` assert `7`. Proves secrets reach the child and the exit
   code is forwarded.
2. **Override semantics.** With `process.env.FOO` pre-set, assert default (`override: true`)
   makes the child see the secret value, and `override: false` makes it see the pre-set value
   (use the same `node -e` exit-code probe).
3. **Command not found.** `runWithEnv('definitely-not-a-real-bin-xyz', [], {})` rejects with a
   "Command not found" error.
4. **Empty command guard.** `inject([], opts)` calls `process.exit(1)` (spy on `process.exit`
   and `logError`).
5. **Handler wiring (mocked).** Mock `loadConfig`, `initDBClient`, and `createSecretsHelpers`
   (or `getAllSecrets`) to return a fixed map; mock `runWithEnv`; assert it's called with the
   resolved vault/environment and that `db.$client.close()` runs even when the child exits
   nonzero.

Match existing test style in `cli/tests/unit/` (crypto.spec.ts) and `cli/vitest.config.mts`.

## Verification (end-to-end)
1. `pnpm cli:build` (esbuild → `dist/deadrop.js`).
2. `deadrop init` then `deadrop vault create demo`; `deadrop secret add FOO bar`.
3. `deadrop inject -- node -e "console.log(process.env.FOO)"` prints `bar`.
4. `deadrop inject -- node -e "process.exit(3)"; echo $?` prints `3` (exit-code passthrough).
5. `deadrop inject -- pnpm build --help` — the child's `--help` is not swallowed by deadrop.
6. `deadrop inject -- sleep 30`, press Ctrl-C — child dies, no orphan process, CLI exits.
7. `--config ./deadrop-ci.json` against a cloud vault config injects its secrets.
8. `pnpm -F cli test` passes.

## Follow-ups (not this session)

An earlier draft of this pipeline-helpers follow-on proposed a different command shape
(`deadrop inject --format env`, printing `KEY=value` to stdout) paired with a new "deadrop
keys" Clerk-API-key auth mechanism for non-interactive CI use. This spec's actual design
(wrap-and-spawn, `deadrop inject -- <cmd>`,
no browser login needed when the config already carries a stored Turso token) supersedes that
for the *local/CI-config-present* case. **Open question, not yet resolved:** is a separate
"deadrop keys" auth mechanism still needed for teams who want to provision CI access without
sharing/committing a full vault config (i.e. a scoped, revocable credential handed to CI rather
than the whole config)? Decide before building the GitHub Action below — it changes the
action's auth story.

- `deadrop-inject` GitHub Action: composite action that downloads the published `deadrop`
  binary and runs `deadrop inject` (or a `--github-env` mode that writes `$GITHUB_ENV` and
  emits `::add-mask::`). No committed bundle. Needs a small GitHub-env output mode in the CLI.
  ```yaml
  - uses: dallen4/deadrop-action@v1
    with:
      key: ${{ secrets.DEADROP_KEY }}   # pending the open question above
      vault: production
  ```
- GitLab CI and CircleCI: thin wrappers (orb / include template) following the same pattern
  as the GitHub Action. Lower priority — ship the GitHub Action first.
- Secrets masked in CI logs (no plaintext values exposed in job output) — verify whatever the
  chosen output mode is (`$GITHUB_ENV` write, `::add-mask::`, etc.) actually masks, not just
  avoids printing.
- Worker `/service-tokens` issue/revoke/exchange + short-lived Turso token TTL (two-factor
  hardening; replaces the long-lived token in the CI config).
- Tier gating: gate `deadrop inject` behind the `ci_tokens` feature once plan-claim plumbing
  lands in the CLI (`shared/config/plans.ts`).
- Documentation: `/docs/features/cli` under a CI/CD section, once the action ships.
- GitHub Actions Marketplace listing for the composite action.

### Acceptance criteria (from the original issue, still applicable to the action phase)
- [ ] `deadrop inject` authenticates non-interactively in CI (resolve the open auth question
      above first)
- [ ] Secrets are masked in CI logs
- [ ] GitHub Actions action published to the Marketplace
- [ ] Documented in `/docs/features/cli`
- [ ] GitLab CI template and CircleCI orb (stretch)

### Related
- #25 API key auth strategy
- PR #71 (original `inject.ts` proof of concept, precedes this spec's design)
