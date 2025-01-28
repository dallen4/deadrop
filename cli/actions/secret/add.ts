import { initDBClient } from 'db/init';
import { createSecretsHelpers } from 'db/secrets';
import { loadConfig } from 'lib/config';
import { logInfo } from 'lib/log';

export async function secretAdd(name: string, value: string) {
  logInfo('adding secret to vault...');

  const { config } = await loadConfig();

  const { vaults, active_vault } = config;

  const activeVault = vaults[active_vault.name];

  const db = await initDBClient(
    activeVault.location,
    activeVault.key,
    activeVault.cloud,
  );

  const { addSecrets } = await createSecretsHelpers(
    vaults[active_vault.name],
    db,
  );

  await addSecrets([
    { name, value, environment: active_vault.environment },
  ]);

  logInfo('secret added successfully!');
}
