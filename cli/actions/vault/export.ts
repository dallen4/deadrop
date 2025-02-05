import { initDBClient } from 'db/init';
import { createSecretsHelpers } from '@shared/db/secrets';
import { loadConfig } from 'lib/config';
import { syncEnv } from 'lib/env';
import { logInfo } from 'lib/log';
import { resolve } from 'path';
import { cwd } from 'process';

// TODO format support (.env, JSON files)
export async function vaultExport(
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

  logInfo(`Secrets retrieved for '${vaultNameInput}' vault!`);

  const fullEnvPath = resolve(cwd(), envDestinationPath);

  await syncEnv(fullEnvPath, secrets);

  logInfo(
    `Secrets successfully exported to '${envDestinationPath}'!`,
  );
}
