import { createSecretsHelpers } from 'db/secrets';
import { loadConfig } from 'lib/config';
import { syncEnv } from 'lib/env';
import { logInfo } from 'lib/log';
import { resolve } from 'path';
import { cwd } from 'process';

export async function vaultSync(
  vaultNameInput: string,
  envDestinationPath: string,
) {
  const { config } = await loadConfig();

  const { vaults, active_vault } = config;

  const { location, key } = vaults[active_vault];

  const { getAllSecrets } = createSecretsHelpers({
    location,
    key,
  });

  const secrets = await getAllSecrets();
  const secretsMap = secrets.reduce(
    (prev, { name, value }) => ({
      ...prev,
      [name]: value,
    }),
    {},
  );

  logInfo(`Secrets synced to ./.env for '${active_vault}' vault!`);
  console.log(secretsMap);

  await syncEnv('./.env', secretsMap);
}
