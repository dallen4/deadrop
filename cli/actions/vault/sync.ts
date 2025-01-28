import { initDBClient } from 'db/init';
import { createSecretsHelpers } from '@shared/db/secrets';
import { loadConfig } from 'lib/config';
import { syncEnv } from 'lib/env';
import { logInfo } from 'lib/log';

export async function vaultSync(
  vaultNameInput: string,
  envDestinationPath: string,
) {
  const { config } = await loadConfig();

  const { vaults, active_vault } = config;

  const activeVault = vaults[active_vault.name];

  const db = await initDBClient(
    activeVault.location,
    activeVault.key,
    activeVault.cloud,
  );

  const { getAllSecrets } = createSecretsHelpers(
    vaults[active_vault.name],
    db,
  );

  const secrets = await getAllSecrets(active_vault.environment);

  await syncEnv('./.env', secrets);

  logInfo(`Secrets synced to ./.env for '${active_vault}' vault!`);
}
