import { createSecretsHelpers } from 'db/secrets';
import { stringify } from 'envfile';
import { loadConfig } from 'lib/config';
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
  const envSource = stringify(secrets);

  logInfo(`Secrets retrieved for '${vaultNameInput}' vault!`);
  console.log(envSource);

  const fullEnvPath = resolve(cwd(), envDestinationPath);

  console.log(fullEnvPath);
}
