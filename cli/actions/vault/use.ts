import chalk from 'chalk';
import { vaultExists } from 'db/vaults';
import { loadConfig, saveConfig } from 'lib/config';
import { logError, logInfo } from 'lib/log';
import { exit } from 'process';
import { DeadropConfig } from '@shared/types/config';

export async function vaultUse(vaultNameInput: string) {
  const { config, filepath: configPath } = await loadConfig();

  const { vaults, active_vault } = config;

  if (!vaultNameInput) {
    logError('Vault name is required to delete!');
    return exit(1);
  }

  if (!vaultExists(vaults, vaultNameInput)) {
    logError('Vault not found!');
    return exit(1);
  }

  if (vaultNameInput === active_vault.name) {
    logInfo(
      `Vault '${chalk.bold(vaultNameInput)}' is already active...`,
    );
    return exit(0);
  }

  const updatedConfig: DeadropConfig = {
    ...config,
    active_vault: {
      name: vaultNameInput,
      environment: 'development',
    },
    vaults,
  };

  await saveConfig(configPath, updatedConfig, true);

  logInfo(`Vault '${chalk.bold(vaultNameInput)}' is now active...`);
  exit(0);
}
