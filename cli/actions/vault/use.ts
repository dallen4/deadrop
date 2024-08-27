import { vaultExists } from 'db/vaults';
import { loadConfig, saveConfig } from 'lib/config';
import { logError, logInfo } from 'lib/log';
import { cwd, exit } from 'process';
import { DeadropConfig } from 'types/config';

export async function vaultUse(vaultNameInput: string) {
  const { config } = await loadConfig();

  const { vaults, active_vault } = config;

  if (!vaultNameInput) {
    logError('Vault name is required to delete!');
    return exit(1);
  }

  if (!vaultExists(vaults, vaultNameInput)) {
    logError('Vault not found!');
    return exit(1);
  }

  if (vaultNameInput === active_vault) {
    logInfo(`Vault '${vaultNameInput}' is already active...`);
    return exit(0);
  }

  const updatedConfig: DeadropConfig = {
    ...config,
    active_vault: vaultNameInput,
    vaults,
  };

  await saveConfig(cwd(), updatedConfig, true);

  logInfo(`Vault '${vaultNameInput}' is now active...`);
  exit(0);
}
