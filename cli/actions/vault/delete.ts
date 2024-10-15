import { confirm } from '@inquirer/prompts';
import { snakeCase } from 'change-case';
import { vaultExists } from 'db/vaults';
import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { loadConfig, saveConfig } from 'lib/config';
import { logError, logInfo } from 'lib/log';
import { cwd, exit } from 'process';

export async function vaultDelete(vaultNameInput: string) {
  const { config } = await loadConfig();

  const { vaults, active_vault } = config;

  const vaultName = snakeCase(vaultNameInput);

  if (!vaultExists(vaults, vaultName)) {
    logError('Vault not found!');
    return exit(1);
  }

  const shouldDelete = await confirm({
    message: `Are you sure you want to delete '${vaultName}' vault?`,
  });

  if (shouldDelete) {
    if (active_vault.name === vaultName) {
      logInfo(
        `User vault to be deleted cannot be selected as active. Switch to a different vault and try again.`,
      );

      return exit(1);
    }
    const { location } = vaults[vaultName];

    await unlink(location);

    delete vaults[vaultName];

    await saveConfig(cwd(), { active_vault, vaults }, true);

    logInfo(`Vault '${vaultName}' deleted succesfully!`);
  }
}
