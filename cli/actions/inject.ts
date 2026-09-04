import { createSecretsHelpers } from '@shared/db/secrets';
import { VaultDBConfig } from '@shared/types/config';
import { randomBytes } from 'crypto';
import { initDBClient } from 'db/init';
import { rmSync } from 'fs';
import {
  MintStrategy,
  mintVaultToken,
  mintVaultTokenWithApiKey,
  resolveMintStrategy,
  VaultNotFoundError,
} from 'lib/auth/vault-token';
import { loadConfig, loadConfigFromPath } from 'lib/config';
import { logError, logInfo, logWarning } from 'lib/log';
import { runWithEnv } from 'lib/process';
import { tmpdir } from 'os';
import { join } from 'path';

type InjectOptions = {
  vault?: string;
  environment?: string;
  config?: string;
  override: boolean;
  refreshToken?: boolean;
  verbose?: boolean;
  ci?: boolean;
  only?: string;
  prefix?: string;
  sync?: boolean;
};

type ResolvedVault = {
  // What this run calls the vault: the config key, what CI passed, or the
  // cloud name once a mint resolves one. Local to the run — never sent
  // anywhere except as the mint input on the session path.
  vaultName: string;
  environment: string;
  vault: VaultDBConfig;
  // vault.location is a temp replica we own and must clean up on exit.
  ephemeral: boolean;
  strategy: MintStrategy;
};

// `--ci` asserts the machine path is available rather than selecting it, so
// a misconfigured pipeline fails here instead of silently falling back to an
// interactive session that has no way to authenticate.
function assertCiCredentials(options: InjectOptions) {
  if (!options.ci) return;

  const missing: string[] = [];

  if (!process.env.DEADROP_API_KEY) missing.push('DEADROP_API_KEY');
  if (!process.env.DEADROP_VAULT_KEY)
    missing.push('DEADROP_VAULT_KEY');

  if (missing.length) {
    logError(`--ci requires ${missing.join(' and ')} to be set.`);
    process.exit(1);
  }
}

// The only writer of the environment binding. Both callers are on the
// ephemeral path, which exists only because DEADROP_VAULT_KEY is set — and
// that key decrypts exactly one environment.
function bindEnvironment(
  resolved: ResolvedVault,
  environment: string,
) {
  resolved.environment = environment;
  resolved.vault.environments[environment] =
    process.env.DEADROP_VAULT_KEY!;
}

// CI supplies the vault, key and environment through env vars, so there is
// no config to load and the replica is a throwaway we delete on exit.
function resolveEphemeralVault(
  options: InjectOptions,
): ResolvedVault {
  const base: Omit<ResolvedVault, 'strategy'> = {
    vaultName:
      options.vault ?? process.env.DEADROP_VAULT ?? 'default',
    environment: '',
    vault: {
      location: join(
        tmpdir(),
        `deadrop-inject-${randomBytes(8).toString('hex')}.db`,
      ),
      environments: {},
    },
    ephemeral: true,
  };

  const resolved: ResolvedVault = {
    ...base,
    strategy: resolveMintStrategy(base, options.refreshToken),
  };

  // An API key's claims carry the environment; every other path has to be
  // told which one to decrypt.
  if (resolved.strategy !== MintStrategy.ApiKey) {
    const environment =
      options.environment ?? process.env.DEADROP_ENVIRONMENT;

    if (!environment) {
      logError(
        'No environment specified. Use -e/--environment or ' +
          'DEADROP_ENVIRONMENT.',
      );
      process.exit(1);
    }

    bindEnvironment(resolved, environment);
  }

  return resolved;
}

async function resolveConfigVault(
  options: InjectOptions,
): Promise<ResolvedVault> {
  const { config } = options.config
    ? await loadConfigFromPath(options.config)
    : await loadConfig();

  const vaultName = options.vault ?? config.active_vault.name;
  const vault = config.vaults[vaultName];

  if (!vault) {
    logError(`Vault '${vaultName}' not found in config.`);
    process.exit(1);
  }

  const base: Omit<ResolvedVault, 'strategy'> = {
    vaultName,
    environment:
      options.environment ?? config.active_vault.environment,
    vault,
    ephemeral: false,
  };

  return {
    ...base,
    strategy: resolveMintStrategy(base, options.refreshToken),
  };
}

// The single mint site for every path. `cloud` is built *from* the mint
// result so the local label can never leak into the derived sync URL.
async function applyMintStrategy(resolved: ResolvedVault) {
  const { strategy, vaultName } = resolved;

  if (
    strategy === MintStrategy.None ||
    strategy === MintStrategy.Cached
  )
    return;

  const isApiKey = strategy === MintStrategy.ApiKey;

  try {
    // The worker prefixes the label it is given, so send the label — an
    // already-resolved name would get prefixed a second time.
    const { name, token, environment } = isApiKey
      ? await mintVaultTokenWithApiKey()
      : await mintVaultToken(vaultName);

    resolved.vault.cloud = { name, authToken: token };

    // The key's claims, not the local label, decide which vault an API key
    // run reads — adopt the resolved name so logs name what actually synced.
    if (isApiKey) resolved.vaultName = name;

    if (environment) bindEnvironment(resolved, environment);
  } catch (err) {
    if (err instanceof VaultNotFoundError) {
      logError(err.message);
      process.exit(1);
    }

    const reason = (err as Error).message;

    logError(
      isApiKey
        ? `Could not mint a CI token for this key: ${reason}`
        : `Could not mint a Turso token for '${vaultName}': ` +
            `${reason} — sign in with 'deadrop login' or set ` +
            `DEADROP_API_KEY.`,
    );
    process.exit(1);
  }
}

async function parseVaultFromOptions(options: InjectOptions) {
  assertCiCredentials(options);

  const configFree = !!process.env.DEADROP_VAULT_KEY;

  // The config-free path reads no config at all, so say so rather than
  // silently dropping a path the caller explicitly pointed us at.
  if (configFree && options.config)
    logWarning(
      `Ignoring --config: DEADROP_VAULT_KEY is set, so the vault is ` +
        `resolved from the environment.`,
    );

  const resolved = configFree
    ? resolveEphemeralVault(options)
    : await resolveConfigVault(options);

  // Must run before reading `environment` — the API key path supplies it.
  await applyMintStrategy(resolved);

  return resolved;
}

// --only names the stored secrets, so the list matches `vault env list`;
// --prefix is applied after, renaming whatever survived the filter.
function shapeSecrets(
  secrets: Record<string, string>,
  { only, prefix }: InjectOptions,
) {
  let shaped = secrets;

  if (only) {
    const wanted = only
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);

    const missing = wanted.filter((name) => !(name in secrets));

    // A typo here would otherwise inject nothing and exit 0.
    if (missing.length) {
      logError(`Not in this environment: ${missing.join(', ')}`);
      process.exit(1);
    }

    shaped = Object.fromEntries(
      wanted.map((name) => [name, secrets[name]]),
    );
  }

  if (prefix)
    shaped = Object.fromEntries(
      Object.entries(shaped).map(([name, value]) => [
        `${prefix}${name}`,
        value,
      ]),
    );

  return shaped;
}

export async function inject(
  command: string[],
  options: InjectOptions,
) {
  if (!command?.length) {
    logError(
      'No command provided. Usage: deadrop inject -- <command>',
    );
    process.exit(1);
  }

  const { vaultName, environment, vault, ephemeral } =
    await parseVaultFromOptions(options);

  const db = await initDBClient(
    vault.location,
    vault.cloud,
    options.sync,
  );

  const { getAllSecrets } = createSecretsHelpers(vault, db);

  const secrets = shapeSecrets(
    await getAllSecrets(environment),
    options,
  );

  const names = Object.keys(secrets);

  logInfo(
    `Injecting ${names.length} secret(s) from '${vaultName}' (${environment})`,
  );

  if (options.verbose && names.length)
    logInfo(`Variables: ${names.join(', ')}`);

  let exitCode = 0;

  try {
    const [cmd, ...args] = command;

    exitCode = await runWithEnv(cmd, args, secrets, {
      override: options.override,
    });
  } catch (err) {
    logError((err as Error).message);

    exitCode = 127;
  } finally {
    db.$client.close();

    // Remove the throwaway CI replica (db + sync sidecars); never a real vault.
    if (ephemeral)
      for (const suffix of ['', '-wal', '-shm', '-info'])
        rmSync(`${vault.location}${suffix}`, { force: true });
  }

  process.exit(exitCode);
}
