# Spec: `deadrop inject` CLI command

## Status

- **Wrap-and-spawn mode — built.** `deadrop inject -- <cmd>` exists today
  (`cli/actions/inject.ts`, `cli/lib/process.ts`, registered in
  `cli/core.ts`), reusing the config-load + cloud-sync + decrypt path. See
  "Command design" and "Files" below for the current shape — kept in this
  doc as the baseline the rest of it extends.
- **CI credential minting + `--github-env` — this session's scope.** See
  "Part A/B/C/D" below. `deadrop inject` today requires a vault config that
  already has a Turso `authToken` baked in, and only wraps a single spawned
  command. This session adds: (1) minting a fresh read-only Turso token from
  just a Clerk API key, so CI never needs a long-lived token stored
  anywhere; (2) a config-free input path (no `.deadroprc`/`--config` file at
  all — just env vars); (3) a `--github-env` output mode that persists
  secrets across an entire CI job instead of wrapping one command; (4) a
  fix to `cli/install.sh` that would otherwise hang/fail in CI.

No GitHub Action wrapper is being built as part of this. Docs will show
users installing `deadrop` directly (existing `install.sh` curl pattern)
and calling `deadrop inject --github-env` themselves — CLI-driven, not
Action-driven. Packaging a composite/marketplace Action is a deliberate
follow-up (it needs its own repo to list on the GitHub Marketplace).

## Context

deadrop vaults hold secrets encrypted client-side (Turso-synced, server
never sees plaintext). Before `inject` existed, the only way to get them
into a process was `deadrop vault export`, which writes a `.env` file to
disk — a plaintext artifact that lingers and has to be cleaned up. `inject`
runs a command with the vault's secrets injected directly into its
environment, decrypted in-memory, nothing written to disk.

For CI specifically, two more gaps remain even with `inject` built:

1. **Token minting.** There's no route that turns a Clerk API key into a
   short-lived, read-only Turso token for a named (or default) vault.
   Without it, CI has to be handed a long-lived Turso token up front —
   reintroducing the lingering-credential problem `inject` exists to avoid.
   Worker-side, `authenticated()`/`restricted()` (`worker/src/lib/middleware.ts`)
   already accept an `AuthOptions.allowApiKey` flag, and
   `cli/lib/auth/clerk.ts`'s `getSessionToken()` already falls back to
   `process.env.DEADROP_API_KEY` when no interactive Clerk session is
   cached — both already committed and working, this session builds the
   route and CLI wiring on top of that foundation.
2. **A `--github-env` output mode.** Wrap-and-spawn only shares secrets
   with one child process. A CI job that builds *and* deploys across
   multiple `run:` steps needs them to persist across the whole job, the
   way `dopplerhq/cli-action`/`1password/load-secrets-action` do it — write
   to `$GITHUB_ENV`, mask in logs, no spawning required.

## Scope

**Built (baseline, unchanged by this session):**
- `deadrop inject [options] -- <command...>` wrap-and-spawn mode
- `cli/lib/process.ts`'s `runWithEnv` (spawn, signal forwarding, exit-code
  passthrough)
- `cli/lib/config.ts`'s `loadConfigFromPath` (explicit `--config` file)

**In scope (this session):**
- `POST /vault/tokens` (new route, replaces the unused `POST /vault/share`)
- `TursoApiError` (status-aware error type) + 404 handling in the new route
- `cli/lib/auth/vault-token.ts` — `mintVaultToken`
- `cli/actions/inject.ts` — auto-mint wiring + config-free input path
- `deadrop inject --github-env` output mode
- `cli/install.sh` — non-interactive/no-tty fix
- `shared/types/config.ts` — `CloudVaultConfig.authToken` becomes optional
- CI/CD docs section (`web/pages/docs/features/cli.mdx`)

**Out of scope (follow-ups, do not build):**
- GitHub Action / composite action wrapper + Marketplace listing
- GitLab CI / CircleCI templates
- Tier gating (`ci_tokens`) — plan-claims plumbing isn't in the CLI yet
- Worker `/service-tokens` issue/revoke/exchange + short-lived-TTL hardening
  on top of the read-only token this session already mints
- `GET /vault/:name` has the same missing-try/catch gap as the old
  `/vault/share` (an unhandled throw on a nonexistent vault becomes a raw
  500, not clean JSON) — pre-existing, not touched by this session
- `vault create --cloud` still can't run from CI (`provisionCloudVault` in
  `cli/actions/vault/create.ts` calls `clerkClient.session.getToken()`
  directly instead of `getSessionToken()`) — pre-existing, unrelated

## Command design

```
deadrop inject [options] -- <command...>
deadrop inject [options] --github-env

Run <command> with the active (or selected) vault's secrets injected as
environment variables, or (with --github-env) persist them to $GITHUB_ENV
for every later step in the same CI job. Secrets are decrypted in-memory
and never written to disk.

Options:
  -v, --vault <name>          vault to inject (default: config active_vault.name,
                              or your account's default vault in config-free mode)
  -e, --environment <env>     environment to inject (default: config active_vault.environment)
  -c, --config <path>         load an explicit config file (JSON or YAML) instead of the
                              auto-discovered .deadroprc
      --no-override           let pre-existing process env vars win over vault values
                              (default: vault values override process env; wrap-and-spawn only)
      --refresh-token         mint a fresh read-only Turso token via /vault/tokens even if
                              the config already has one (requires Clerk auth: cached
                              session or DEADROP_API_KEY)
      --github-env            write secrets to $GITHUB_ENV instead of spawning a command;
                              requires running inside a GitHub Actions job
      --verbose               log injected variable NAMES (never values)

Examples:
  deadrop inject -- pnpm build
  deadrop inject -v prod -e production -- node server.js
  deadrop inject --config ./deadrop-ci.json -- ./deploy.sh
  DEADROP_API_KEY=... deadrop inject --config ./deadrop-ci.json -- ./deploy.sh   # no stored token

  # CI, config-free (see Part B):
  DEADROP_API_KEY=... DEADROP_VAULT_KEY=... deadrop inject --github-env -e production
```

### `--` separator (Commander semantics — important, still applies)
Registered with a variadic argument: `.argument('[command...]', '…')`
(square brackets — optional, changed from the original required `<command...>`
to allow `--github-env` runs with no wrapped command at all). Commander
treats everything after a standalone `--` as positional operands, so
`deadrop inject -v prod -- pnpm build --watch` parses `{ vault: 'prod' }`
and passes `['pnpm','build','--watch']` — the child's own `--watch` flag is
safe. `inject.ts`'s own validation (not Commander's argument syntax) enforces
"command required unless `--github-env`", since Commander can't express that
conditional itself.

### Env merge + exit semantics (wrap-and-spawn mode)
- Default (`override` true): child env = `{ ...process.env, ...secrets }` (vault wins).
- `--no-override`: `{ ...secrets, ...process.env }` (existing env wins).
- Spawn with `stdio: 'inherit'`, `shell: false` (no shell-injection surface; users needing
  shell features run `-- sh -c "…"`).
- Forward `SIGINT`/`SIGTERM`/`SIGHUP` to the child; wait for it to exit, then exit the CLI with
  the child's exit code (or `128 + signal` if it was signalled). ENOENT (command not found) →
  clear error, exit 127.
- Never log secret values. Log only a count by default; `--verbose` adds names.

### `--github-env` semantics (this session)
- No spawning, no command argument — errors if one is passed.
- `--no-override` has no coherent meaning here (no child process to merge
  against) — errors if combined with `--github-env`.
- Requires `process.env.GITHUB_ENV` to exist; errors clearly if missing
  (guards against running this mode outside an actual GitHub Actions job).
- For each secret: emit `::add-mask::<value>` to stdout *before* it touches
  any file (masks it in this and all later job log output), then append to
  the `$GITHUB_ENV` file using a random-delimiter heredoc form
  (`NAME<<ghadelim_xxxx\nvalue\nghadelim_xxxx`), not naive `NAME=value` —
  values can contain `=`/newlines.
- Same logging posture as wrap-and-spawn: count by default, `--verbose`
  adds names, never values.

## Files

### Already built (baseline)
- `cli/actions/inject.ts` — the `inject(command, options)` handler
  (will be rewritten in this session — see below)
- `cli/lib/process.ts` — `runWithEnv` (unchanged by this session)
- `cli/tests/unit/inject.spec.ts` — existing tests (extended in this session)
- `cli/core.ts` — command registration (modified — see below)
- `cli/lib/config.ts` — `loadConfigFromPath` (unchanged)

### New (this session)

- `cli/lib/auth/vault-token.ts`:
  ```ts
  import { createClient } from '@shared/client';
  import { syncUrl as toSyncUrl } from '@shared/lib/turso/utils';
  import { getSessionToken } from './clerk';

  export class VaultNotFoundError extends Error {}

  export type MintedVaultCreds = { authToken: string; syncUrl: string };

  export async function mintVaultToken(
    vaultName?: string,
  ): Promise<MintedVaultCreds | null> {
    const token = await getSessionToken();
    if (!token) return null;

    const deadropClient = createClient(process.env.DEADROP_API_URL!, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const response = await deadropClient.vault.tokens.$post({
      json: vaultName ? { name: vaultName } : {},
    });

    if (response.status === 404) {
      const { error } = (await response.json()) as { error: string };
      throw new VaultNotFoundError(error);
    }
    if (response.status !== 201) return null;

    const { token: authToken, hostname } = (await response.json()) as {
      token: string;
      hostname: string;
    };
    return { authToken, syncUrl: toSyncUrl(hostname) };
  }
  ```
  Goes through `getSessionToken()` (not an inline
  `clerkClient.session.getToken()` call) specifically so the
  `DEADROP_API_KEY` fallback applies here.

- `cli/lib/github-env.ts`:
  ```ts
  import { appendFileSync } from 'fs';
  import { randomBytes } from 'crypto';

  export function writeGithubEnv(secrets: Record<string, string>) {
    const path = process.env.GITHUB_ENV!;

    for (const [name, value] of Object.entries(secrets)) {
      // Mask before the value touches any file or log output.
      console.log(`::add-mask::${value}`);

      const delimiter = `ghadelim_${randomBytes(16).toString('hex')}`;
      appendFileSync(path, `${name}<<${delimiter}\n${value}\n${delimiter}\n`);
    }
  }
  ```
  Random per-value delimiter (not a fixed string) so a secret value that
  happens to contain a delimiter-shaped substring can't break the file
  format.

- `cli/tests/unit/github-env.spec.ts` — see Testing.

### Modified (this session)

- `cli/actions/inject.ts` — rewrite:
  ```ts
  import { randomBytes } from 'crypto';
  import { tmpdir } from 'os';
  import { join } from 'path';
  import { initDBClient } from 'db/init';
  import { createSecretsHelpers } from '@shared/db/secrets';
  import { loadConfig, loadConfigFromPath } from 'lib/config';
  import {
    mintVaultToken,
    VaultNotFoundError,
  } from 'lib/auth/vault-token';
  import { runWithEnv } from 'lib/process';
  import { writeGithubEnv } from 'lib/github-env';
  import { logError, logInfo } from 'lib/log';
  import { VaultDBConfig } from '@shared/types/config';

  type InjectOptions = {
    vault?: string;
    environment?: string;
    config?: string;
    override: boolean;
    refreshToken?: boolean;
    githubEnv?: boolean;
    verbose?: boolean;
  };

  async function resolveVault(options: InjectOptions) {
    const decryptionKey = process.env.DEADROP_VAULT_KEY;

    // Config-free path: DEADROP_VAULT_KEY present means CI is supplying
    // everything itself — skip loadConfig/loadConfigFromPath entirely, even
    // if a .deadroprc happens to be discoverable on this machine.
    if (decryptionKey) {
      const vaultName = options.vault ?? process.env.DEADROP_VAULT;
      const environment =
        options.environment ?? process.env.DEADROP_ENVIRONMENT;

      if (!environment) {
        logError(
          'No environment specified. Use -e/--environment or ' +
            'DEADROP_ENVIRONMENT.',
        );
        process.exit(1);
      }

      const vault: VaultDBConfig = {
        location: join(tmpdir(), `deadrop-inject-${randomBytes(8).toString('hex')}.db`),
        environments: { [environment]: decryptionKey },
      };

      return { vaultName, environment, vault };
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

    return { vaultName, environment, vault };
  }

  export async function inject(
    command: string[] | undefined,
    options: InjectOptions,
  ) {
    if (options.githubEnv) {
      if (command?.length) {
        logError('--github-env does not take a command.');
        process.exit(1);
      }
      if (options.override === false) {
        logError('--no-override has no effect with --github-env.');
        process.exit(1);
      }
      if (!process.env.GITHUB_ENV) {
        logError(
          '--github-env requires running inside a GitHub Actions job ' +
            '(GITHUB_ENV is not set).',
        );
        process.exit(1);
      }
    } else if (!command?.length) {
      logError('No command provided. Usage: deadrop inject -- <command>');
      process.exit(1);
    }

    const { vaultName, environment, vault } = await resolveVault(options);

    let cloud = vault.cloud;
    if (!cloud || !cloud.authToken || options.refreshToken) {
      let minted;
      try {
        minted = await mintVaultToken(vaultName);
      } catch (err) {
        if (err instanceof VaultNotFoundError) {
          logError(err.message);
          process.exit(1);
        }
        throw err;
      }
      if (!minted) {
        logError(
          `Could not mint a Turso token for '${vaultName ?? 'default vault'}' ` +
            `— sign in (deadrop login) or set DEADROP_API_KEY.`,
        );
        process.exit(1);
      }
      cloud = { name: vaultName ?? 'default', ...minted };
    }

    const db = await initDBClient(vault.location, cloud);
    const { getAllSecrets } = createSecretsHelpers({ ...vault, cloud }, db);
    const secrets = await getAllSecrets(environment);

    const names = Object.keys(secrets);
    logInfo(
      `Injecting ${names.length} secret(s) from ` +
        `'${vaultName ?? 'default vault'}' (${environment})`,
    );
    if (options.verbose && names.length)
      logInfo(`Variables: ${names.join(', ')}`);

    try {
      if (options.githubEnv) {
        writeGithubEnv(secrets);
        process.exit(0);
      }

      const [cmd, ...args] = command!;
      const exitCode = await runWithEnv(cmd, args, secrets, {
        override: options.override,
      });
      process.exit(exitCode);
    } catch (err) {
      logError((err as Error).message);
      process.exit(127);
    } finally {
      db.$client.close();
    }
  }
  ```
  Note the guard is `!cloud || !cloud.authToken || options.refreshToken`,
  not just `cloud && !cloud.authToken`: the config-free path's synthesized
  vault has `vault.cloud` as `undefined` (no cloud block exists yet at all),
  so the guard must mint whenever `cloud` is missing entirely, not only
  when it's present-but-tokenless.

- `cli/core.ts`:
  ```ts
  deadrop
    .command('inject')
    .description('run a command with vault secrets injected as env vars')
    .argument('[command...]', 'command to run (after --); omit with --github-env')
    .option('-v, --vault <name>', 'vault to inject (optional: defaults to your default vault)')
    .option('-e, --environment <env>', 'environment to inject')
    .option('-c, --config <path>', 'explicit config file (JSON or YAML)')
    .option('--no-override', 'let existing env vars win over vault values')
    .option('--refresh-token', 'mint a fresh read-only Turso token via /vault/tokens')
    .option('--github-env', 'write secrets to $GITHUB_ENV instead of spawning a command')
    .option('--verbose', 'log injected variable names (never values)')
    .action(inject);
  ```
  `<command...>` → `[command...]` (required → optional) is the one breaking
  change to the existing registration.

- `shared/types/config.ts`:
  ```ts
  export type CloudVaultConfig = {
    name: string;
    syncUrl: string;
    authToken?: string;
  };
  ```
  Only `initDBConfig` (`shared/db/init.ts:14`) actually reads
  `cloudConfig.syncUrl`/`cloudConfig.authToken` for the connection itself —
  `cloud.name` is a display-only field elsewhere (`cli/actions/vault/create.ts`,
  `web/lib/db.ts`, `vscode-extension/src/VaultPanel.ts`); it doesn't need a
  real hashed value for `inject`'s purposes, just a non-empty string.

- `shared/lib/turso/client.ts` — status-aware errors. Replace the plain
  `Error` thrown by `request()` with a typed subclass so callers can branch
  on HTTP status instead of parsing the message string:
  ```ts
  export class TursoApiError extends Error {
    constructor(
      public readonly status: number,
      method: string,
      path: string,
      body: string,
    ) {
      super(`Turso API ${method} ${path} (${status}): ${body}`);
      this.name = 'TursoApiError';
    }
  }
  ```
  In `request()`, replace:
  ```ts
  throw new Error(`Turso API ${method} ${path} (${res.status}): ${text}`);
  ```
  with:
  ```ts
  throw new TursoApiError(res.status, method, path, text);
  ```
  Export `TursoApiError` from `shared/lib/turso/index.ts` alongside the
  existing re-exports.

- `worker/src/routers/vault.ts` — replace `POST /vault/share` entirely:
  ```ts
  const VaultTokenSchema = z.object({ name: z.string().optional() });

  // ...

  .post(
    AppRouteParts.Tokens,
    restricted({ allowApiKey: true }),
    zValidator('json', VaultTokenSchema),
    async (c) => {
      const userId = c.var.clerkAuth().userId!;

      const { createVaultToken, getVault } = createVaultUtils(
        c.env.TURSO_ORGANIZATION,
        c.env.TURSO_PLATFORM_API_TOKEN,
      );

      const { name } = c.req.valid('json');

      try {
        const vaultName = await vaultNameFromUserId(userId!, name);

        const [vault, token] = await Promise.all([
          getVault(vaultName),
          createVaultToken(vaultName, 'read-only'),
        ]);

        return c.json({ token, hostname: vault?.Hostname }, 201);
      } catch (error) {
        if (error instanceof TursoApiError && error.status === 404) {
          return c.json(
            {
              error: name
                ? `Vault '${name}' not found.`
                : 'No default vault found for this account.',
            },
            404,
          );
        }
        return c.json(
          { error: `Unexpected error: ${(error as Error).message}` },
          500,
        );
      }
    },
  )
  ```
  Notes:
  - `name` optional mirrors `POST /vault`'s `CreateVaultSchema` exactly —
    `vaultNameFromUserId(userId!, undefined)` collapses to the `<hash13>`
    user prefix with no vault suffix, the same "default vault" name
    `POST /vault` already produces when *it's* called with no name. No new
    default-vault infra needed — this is the existing mechanism, reused.
  - `getVault` and `createVaultToken` run in parallel (`Promise.all`) since
    neither depends on the other's result.
  - Always mints `'read-only'` — this route has one job (CI/inject
    read-access), not general-purpose token issuance.
  - `AppRouteParts.Share`/`AppRoutes.ShareVault` (`worker/src/constants.ts`)
    rename to `Tokens`/`VaultTokens`. Confirmed dead code — grepped, zero
    callers anywhere in `web/`, `cli/`, `vscode-extension/`, `shared/`,
    `tests/` — free to rename/reshape with no back-compat concern.

- `cli/install.sh` — non-interactive/no-tty guard around the existing PATH
  prompt (currently lines 69-84). Purely additive — wraps the existing
  interactive block in a condition, adds a non-interactive fallback branch,
  doesn't remove or change any existing successful-install behavior:
  ```bash
  if ! command -v deadrop &>/dev/null; then
    if [ -t 1 ] && [ -z "${CI:-}" ] && [ -r /dev/tty ]; then
      SHELL_RC=""
      case "${SHELL:-}" in
        */zsh)  SHELL_RC="$HOME/.zshrc" ;;
        */bash) SHELL_RC="$HOME/.bashrc" ;;
        *)      SHELL_RC="$HOME/.profile" ;;
      esac
      printf "\n%s is not in your PATH. Add it now? [y/N] " "$INSTALL_DIR" >/dev/tty
      read -r REPLY </dev/tty
      if [[ "$REPLY" =~ ^[Yy]$ ]]; then
        echo "export PATH=\"${INSTALL_DIR}:\$PATH\"" >> "$SHELL_RC"
        echo "Added to ${SHELL_RC}. Run: source ${SHELL_RC}"
      else
        echo "Skipped. Add manually: export PATH=\"${INSTALL_DIR}:\$PATH\""
      fi
    else
      echo "${INSTALL_DIR} is not in your PATH."
      echo "Add manually: export PATH=\"${INSTALL_DIR}:\$PATH\""
    fi
  fi
  ```
  Three independent signals (any one being false skips the interactive
  branch): `[ -t 1 ]` (stdout isn't a terminal), `[ -z "${CI:-}" ]` (GitHub
  Actions — and virtually every CI provider — sets `CI=true`
  automatically), `[ -r /dev/tty ]` (the actual thing that fails under
  `set -euo pipefail` today). Belt-and-suspenders rather than relying on
  just one.

- `web/pages/docs/features/cli.mdx` — add a CI/CD section:
  ```yaml
  - name: Install deadrop
    run: curl -fsSL https://raw.githubusercontent.com/dallen4/deadrop/main/cli/install.sh | bash

  - name: Add deadrop to PATH
    run: echo "$HOME/.local/bin" >> "$GITHUB_PATH"

  - name: Inject secrets
    run: deadrop inject --github-env -e production
    env:
      DEADROP_API_KEY: ${{ secrets.DEADROP_API_KEY }}
      DEADROP_VAULT_KEY: ${{ secrets.DEADROP_VAULT_KEY }}

  - run: pnpm build   # sees injected env vars
  - run: pnpm deploy  # sees them too
  ```
  Call out explicitly: `vault` (`-v`) is optional and defaults to the
  account's default vault; `environment` is required; the only two GitHub
  *secrets* needed are `DEADROP_API_KEY` and `DEADROP_VAULT_KEY` —
  everything else (vault name, environment) is plain, non-sensitive
  workflow config.

## Reused code (do not reimplement)

- `getSessionToken()` — `cli/lib/auth/clerk.ts` (session or `DEADROP_API_KEY`)
- `createVaultUtils`, `vaultNameFromUserId`, `syncUrl()` — `shared/lib/turso/`
- `loadConfig`/`loadConfigFromPath` — `cli/lib/config.ts` (unchanged)
- `initDBClient`, `initDBConfig` — `cli/db/init.ts`, `shared/db/init.ts`
- `createSecretsHelpers(vault, db).getAllSecrets(environment)` —
  `shared/db/secrets.ts` (queries the `secrets` table, decrypts via
  `unwrapSecret`)
- `runWithEnv` — `cli/lib/process.ts` (unchanged, wrap-and-spawn mode only)
- `logInfo`/`logError` — `cli/lib/log`

## Notes / gotchas for the implementer

- The handler signature is `(command: string[] | undefined, options)`
  because of the now-optional `[command...]` argument.
- `--no-override` makes Commander populate `options.override = false`
  (camelCased, negated). Type `InjectOptions.override` as required
  `boolean`.
- Do NOT delete any DB file on teardown for the config-file path —
  `vault.location` may be the user's real persistent vault. Teardown is
  just `db.$client.close()`. The config-free path's synthesized `location`
  is a fresh temp path each run; no cleanup needed beyond `close()` either
  (the CI runner's disk is thrown away regardless).
- Never write the minted `authToken` back to any config file — in-memory
  for that process only, matching the existing posture elsewhere in the
  CLI (no plaintext/keys lingering on disk).
- The per-environment decryption key is a separate concept from the Turso
  `authToken` and is never mintable/fetchable server-side by design — this
  was verified against the actual implementation (`shared/lib/vault.ts`'s
  `initEnvKey`, the `secrets` table schema, `worker/src/routers/vault.ts`)
  during design, not assumed. A config-free CI run must always supply it
  via `DEADROP_VAULT_KEY`.
- `DEADROP_VAULT_KEY` is read only from the environment, never from a CLI
  flag — flag values are more exposed (shell history, `ps aux` during the
  process's lifetime) than an env var set directly on a CI step.
- Don't confuse `CloudVaultConfig.name` (display-only, arbitrary string is
  fine for the config-free path) with the *hashed* Turso database name
  (`vaultNameFromUserId`'s output) — the CLI never needs to compute the
  hashed name itself; the worker does that server-side and only ever
  returns a `hostname`, not the hashed name.
- Prettier: 70-char width, single quotes, semicolons, trailing commas.

## Testing (`cli/tests/unit/inject.spec.ts`, extend existing file; `vitest`)

Existing coverage (baseline, keep passing):
1. Real env-injection round-trip via `runWithEnv` (no mocks).
2. Override semantics (`--no-override` vs default).
3. Command not found → rejects with a clear error.
4. Empty command guard (wrap-and-spawn mode only, now conditional on
   `!options.githubEnv`).
5. Handler wiring (mocked `loadConfig`/`initDBClient`/`createSecretsHelpers`/
   `runWithEnv`).

New (this session):
6. **Config-free resolution.** With `DEADROP_VAULT_KEY` set and no
   `.deadroprc` discoverable (mock `loadConfig` to never be called — assert
   it isn't), `resolveVault`/`inject` builds an in-memory vault config from
   `DEADROP_VAULT`/`DEADROP_ENVIRONMENT`/`DEADROP_VAULT_KEY` and proceeds.
7. **Default vault (no name).** `options.vault` and `DEADROP_VAULT` both
   unset in config-free mode; assert `mintVaultToken` is called with
   `undefined`, not an empty string or `'default'`.
8. **Mints on missing token** (config-file path): `vault.cloud.authToken`
   undefined, `mintVaultToken` mocked to resolve creds, assert
   `initDBClient` receives `{ ...cloud, authToken, syncUrl }` and the
   original config object is never mutated/re-saved.
9. **`--refresh-token` forces a re-mint** even when a token already exists.
10. **`VaultNotFoundError` surfaces cleanly**: `mintVaultToken` mocked to
    throw it; assert `logError` gets that exact message and
    `process.exit(1)` — not the generic "Could not mint a token" message.
11. **`--github-env` mode**: mock `writeGithubEnv`; assert it's called with
    the resolved secrets map and the process exits 0 without calling
    `runWithEnv`.
12. **`--github-env` guards**: command args present → error + exit 1;
    `--no-override` combined → error + exit 1; `GITHUB_ENV` unset → error +
    exit 1 (spy `process.env`).
13. **`writeGithubEnv` masking + format** (`cli/tests/unit/github-env.spec.ts`,
    new file): given `{ FOO: 'bar' }`, asserts `console.log` was called
    with exactly `::add-mask::bar` *before* the file write, and the
    appended file content matches the `NAME<<delimiter\nvalue\ndelimiter\n`
    shape (use a temp file + `GITHUB_ENV` pointed at it, read it back and
    parse).
14. **Worker: `POST /vault/tokens`** (wherever the existing vault router
    tests live — check `worker/tests/` first): name omitted →
    `vaultNameFromUserId` called with `undefined`; vault not found (mock
    `getVault`/`createVaultToken` to throw `TursoApiError(404, ...)`) → 404
    JSON response, not 500; any other thrown error → 500 as before.

Match existing test style in `cli/tests/unit/` (crypto.spec.ts) and
`cli/vitest.config.mts`.

## Verification (end-to-end)

1. `pnpm cli:build`.
2. `deadrop init`, `deadrop vault create demo --cloud`, `deadrop secret add
   FOO bar`.
3. `deadrop inject -- node -e "console.log(process.env.FOO)"` prints `bar`
   (wrap-and-spawn baseline still works).
4. `deadrop inject -- node -e "process.exit(3)"; echo $?` prints `3`
   (exit-code passthrough baseline).
5. Delete the stored `authToken` from the generated `.deadroprc` — re-run
   step 3 — `inject` mints a fresh token and still injects successfully.
   Confirm the config file on disk is unchanged afterward.
6. `export DEADROP_API_KEY=...` (a real Clerk API key), clear any cached
   session, repeat step 5 — token still mints via the `DEADROP_API_KEY`
   fallback.
7. Config-free: run from an empty temp dir (no `.deadroprc` discoverable),
   `export DEADROP_API_KEY=... DEADROP_VAULT_KEY=<real key>
   DEADROP_ENVIRONMENT=development`, run `deadrop inject -- node -e
   "console.log(process.env.FOO)"` with no `-v` — resolves the default
   vault, prints `bar`.
8. `--github-env`: in an actual GitHub Actions workflow (or `act` locally),
   run the docs example end-to-end (Files → `cli.mdx` section) — confirm a
   later `pnpm build` step actually sees the injected vars, and confirm the
   log output shows `***` in place of the secret value (GitHub's own mask).
9. `curl ... | bash` the updated `install.sh` inside an actual GitHub
   Actions `run:` step — confirm it completes without hanging or erroring
   on the PATH prompt.
10. `pnpm -F cli test` and `pnpm -F worker test` pass.

## Follow-ups (not this session)

- `deadrop-inject` GitHub Action: composite action wrapping this CLI,
  published to the Marketplace — needs its own repo (Marketplace
  requirement), deliberately deferred in favor of CLI-driven docs for now.
- GitLab CI / CircleCI equivalents of the docs section above.
- Worker `/service-tokens` issue/revoke/exchange + shorter TTL — hardening
  on top of the on-demand read-only minting this session ships, not a new
  capability.
- Tier gating (`ci_tokens`) once plan-claim plumbing lands in the CLI
  (`shared/config/plans.ts`).
- `GET /vault/:name`'s missing try/catch (same `TursoApiError` pattern
  applies) — adjacent to this session's worker changes but a different
  route, left alone here.
- `vault create --cloud` from CI (`provisionCloudVault` bypassing
  `getSessionToken()`) — symmetry fix, not required for `inject`.
- GitHub Actions Marketplace listing for the eventual composite action.

### Related

- #25 API key auth strategy
- PR #71 (original `inject.ts` proof of concept)
