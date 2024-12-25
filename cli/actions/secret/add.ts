import { loadConfig } from 'lib/config';
import { logInfo } from 'lib/log';
import { addSecretsToVault } from 'logic/secrets';

export async function secretAdd(name: string, value: string) {
  logInfo('adding secret to vault...');

  const { config } = await loadConfig();

  const { vaults, active_vault } = config;

  await addSecretsToVault(vaults[active_vault.name], [
    { name, value, environment: active_vault.environment },
  ]);

  logInfo('secret added successfully!');
}
