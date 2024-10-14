import chalk from 'chalk';
import { createSecretsHelpers } from 'db/secrets';
import { populate } from 'dotenv';
import { loadConfig } from 'lib/config';
import { logInfo } from 'lib/log';

(async function () {
  const { config } = await loadConfig();

  const { vaults, active_vault } = config;

  logInfo(
    `deadrop config detected, using '${chalk.bold(active_vault.name)}' vault...`,
  );

  const { location, key } = vaults[active_vault.name];

  const { getAllSecrets } = createSecretsHelpers({
    location,
    key,
  });

  const secrets = await getAllSecrets();
  console.log(secrets);

  populate(process.env as Record<string, string>, secrets);

  logInfo('Secrets loaded from vault successfully!');
})();
