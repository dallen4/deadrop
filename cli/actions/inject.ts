import { initDBClient } from 'db/init';
import { createSecretsHelpers } from '@shared/db/secrets';
import { loadConfig, loadConfigFromPath } from 'lib/config';
import { runWithEnv } from 'lib/process';
import { logError, logInfo } from 'lib/log';

type InjectOptions = {
  vault?: string;
  environment?: string;
  config?: string;
  override: boolean;
  verbose?: boolean;
};

export async function inject(
  command: string[],
  options: InjectOptions,
) {
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
  } catch (err) {
    logError((err as Error).message);
    exitCode = 127;
  } finally {
    db.$client.close();
  }
  process.exit(exitCode);
}
