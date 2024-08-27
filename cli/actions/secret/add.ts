import { createSecretsHelpers } from 'db/secrets';
import { loadConfig } from 'lib/config';
import { logInfo } from 'lib/log';

export async function secretAdd(name: string, value: string) {
  logInfo('adding secret to vault...');

  const { config } = await loadConfig();

  const { vaults, active_vault } = config;

  const { addSecrets } = createSecretsHelpers(vaults[active_vault]);

  await addSecrets([{ name, value }]);

  logInfo('secret added successfully!');
}
