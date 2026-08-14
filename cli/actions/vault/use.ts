import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import { vaultExists } from 'db/vaults';
import { loadConfig, saveConfig } from 'lib/config';
import { logError, logInfo } from 'lib/log';
import { dirname } from 'path';
import { exit } from 'process';
import { DeadropConfig } from '@shared/types/config';

export async function vaultUse(
  vaultNameInput: string | undefined,
  options: { environment?: string } = {},
) {
  const { config, filepath: configPath } = await loadConfig();

  const { vaults, active_vault } = config;

  if (!vaultNameInput) {
    const vaultNames = Object.keys(vaults);

    if (!vaultNames.length) {
      logError('No vaults configured, run `deadrop vault create` first!');
      return exit(1);
    }

    vaultNameInput = await select({
      message: 'Select a vault to switch to',
      choices: vaultNames.map((name) => ({
        name:
          name === active_vault.name ? `${name} (active)` : name,
        value: name,
      })),
      default: active_vault.name,
    });
  }

  if (!vaultExists(vaults, vaultNameInput)) {
    logError('Vault not found!');
    return exit(1);
  }

  if (vaultNameInput === active_vault.name && !options.environment) {
    logInfo(
      `Vault '${chalk.bold(vaultNameInput)}' is already active...`,
    );
    return exit(0);
  }

  const updatedConfig: DeadropConfig = {
    ...config,
    active_vault: {
      name: vaultNameInput,
      environment: options.environment ?? active_vault.environment,
    },
    vaults,
  };

  await saveConfig(dirname(configPath), updatedConfig, true);

  logInfo(`Vault '${chalk.bold(vaultNameInput)}' is now active...`);
  exit(0);
}
