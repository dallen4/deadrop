import { createSecretsHelpers } from 'db/secrets';
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

  const { location, key } = vaults[active_vault.name];

  const { getAllSecrets } = createSecretsHelpers({
    location,
    key,
  });

  const secrets = await getAllSecrets();

  logInfo(`Secrets retrieved for '${vaultNameInput}' vault!`);

  const fullEnvPath = resolve(cwd(), envDestinationPath);

  await syncEnv(fullEnvPath, secrets);

  logInfo(
    `Secrets successfully exported to '${envDestinationPath}'!`,
  );
}
