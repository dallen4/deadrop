import { initDBClient } from 'db/init';
import { createSecretsHelpers } from '@shared/db/secrets';
import { loadConfig } from 'lib/config';
import { syncEnv } from 'lib/env';
import { logInfo } from 'lib/log';
import { exit } from 'process';

export async function vaultSync(
  vaultNameInput: string,
  envDestinationPath: string,
) {
  const { config } = await loadConfig();

  const { vaults, active_vault } = config;

  const activeVault = vaults[active_vault.name];

  const db = await initDBClient(activeVault.location, activeVault.cloud);

  const { getAllSecrets } = createSecretsHelpers(
    vaults[active_vault.name],
    db,
  );

  const secrets = await getAllSecrets(active_vault.environment);

  const destination = envDestinationPath ?? './.env';

  await syncEnv(destination, secrets);

  logInfo(`Secrets synced to ${destination} for '${vaultNameInput}' vault!`);

  return exit(0);
}
