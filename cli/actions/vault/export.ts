import { createSecretsHelpers } from 'db/secrets';
import { loadConfig } from 'lib/config';
import { syncEnv } from 'lib/env';
import { logInfo } from 'lib/log';
import { resolve } from 'path';
import { cwd } from 'process';
import { Env } from 'types/config';

// TODO format support (.env, JSON files)
export async function vaultExport(
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

  logInfo(`Secrets retrieved for '${vaultNameInput}' vault!`);

  const fullEnvPath = resolve(cwd(), envDestinationPath);

  const secretsMap: Env = secrets.reduce(
    (prev, { name, value }) => ({
      ...prev,
      [name]: value,
    }),
    {},
  );

  await syncEnv(fullEnvPath, secretsMap);

  logInfo(
    `Secrets successfully exported to '${envDestinationPath}'!`,
  );
}