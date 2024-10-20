import { createSecretsHelpers } from 'db/secrets';
import { loadConfig } from 'lib/config';
import { logInfo } from 'lib/log';

export async function secretRemove(name: string) {
  logInfo('removing secret to vault...');

  const { config } = await loadConfig();

  const { vaults, active_vault } = config;

  const { removeSecret } = createSecretsHelpers(
    vaults[active_vault.name],
  );

  await removeSecret(name);

  logInfo('secret removed successfully!');
}
