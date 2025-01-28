import { initDBClient } from 'db/init';
import { createSecretsHelpers } from 'db/secrets';
import { loadConfig } from 'lib/config';
import { logInfo } from 'lib/log';

export async function secretRemove(name: string) {
  logInfo('removing secret to vault...');

  const { config } = await loadConfig();

  const { vaults, active_vault } = config;

  const activeVault = vaults[active_vault.name];

  const db = await initDBClient(
    activeVault.location,
    activeVault.key,
    activeVault.cloud,
  );

  const { removeSecret } = await createSecretsHelpers(
    vaults[active_vault.name],
    db,
  );

  await removeSecret(name);

  logInfo('secret removed successfully!');
}
