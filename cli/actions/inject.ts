import { randomBytes } from 'crypto';
import { rmSync } from 'fs';
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
import { logError, logInfo } from 'lib/log';
import { VaultDBConfig } from '@shared/types/config';

type InjectOptions = {
  vault?: string;
  environment?: string;
  config?: string;
  override: boolean;
  refreshToken?: boolean;
  verbose?: boolean;
};

type ResolvedVault = {
  vaultName?: string;
  environment: string;
  vault: VaultDBConfig;
  // vault.location is a temp replica we own and must clean up on exit.
  ephemeral: boolean;
};

async function resolveVault(
  options: InjectOptions,
): Promise<ResolvedVault> {
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
      location: join(
        tmpdir(),
        `deadrop-inject-${randomBytes(8).toString('hex')}.db`,
      ),
      environments: { [environment]: decryptionKey },
    };

    return { vaultName, environment, vault, ephemeral: true };
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

  return { vaultName, environment, vault, ephemeral: false };
}

export async function inject(
  command: string[],
  options: InjectOptions,
) {
  if (!command?.length) {
    logError('No command provided. Usage: deadrop inject -- <command>');
    process.exit(1);
  }

  const { vaultName, environment, vault, ephemeral } =
    await resolveVault(options);

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
