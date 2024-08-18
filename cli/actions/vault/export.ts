import { createSecretsHelpers } from 'db/secrets';
import { loadConfig } from 'lib/config';
import { logInfo } from 'lib/log';

export async function vaultExport(vaultNameInput: string) {
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
    {} as Record<string, string>,
  );

  logInfo(`Secrets retrieved for '${vaultNameInput}' vault!`);
  console.log(secretsMap);
}
