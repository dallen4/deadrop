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
      location: join(
        tmpdir(),
        `deadrop-inject-${randomBytes(8).toString('hex')}.db`,
      ),
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
  command: string[],
  options: InjectOptions,
) {
  if (!command?.length) {
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
    const [cmd, ...args] = command;
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
