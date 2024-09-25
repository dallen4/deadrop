import { createSecretsHelpers } from 'db/secrets';
import { loadConfig } from 'lib/config';
import { syncEnv } from 'lib/env';
import { logInfo } from 'lib/log';

export async function vaultSync(
  vaultNameInput: string,
  envDestinationPath: string,
) {
  const { config } = await loadConfig();

  const { vaults, active_vault } = config;

  const { location, key } = vaults[active_vault.name];

  const { getAllSecrets } = createSecretsHelpers({
    location,
    key,
  });

  const secrets = await getAllSecrets();

  logInfo(`Secrets synced to ./.env for '${active_vault}' vault!`);
  console.log(secrets);

  await syncEnv('./.env', secrets);
}
