import { confirm } from '@inquirer/prompts';
import { vaultExists } from 'db/vaults';
import { unlink } from 'fs/promises';
import { createDeadropClient } from 'lib/api';
import { loadConfig, saveConfig } from 'lib/config';
import { logError, logInfo, logWarning } from 'lib/log';
import { exit } from 'process';

export async function vaultDelete(vaultNameInput: string) {
  const { config, filepath: configPath } = await loadConfig();

  const { vaults, active_vault } = config;

  if (!vaultExists(vaults, vaultNameInput)) {
    logError('Vault not found!');
    return exit(1);
  }

  const shouldDelete = await confirm({
    message: `Are you sure you want to delete '${vaultNameInput}' vault?`,
  });

  if (shouldDelete) {
    if (active_vault.name === vaultNameInput) {
      logWarning(
        `User vault to be deleted cannot be selected as active. Switch to a different vault and try again.`,
      );

      return exit(1);
    }
    const { location, cloud } = vaults[vaultNameInput];

    const deadropClient = await createDeadropClient();

    if (cloud) {
      logInfo(
        'Cloud configuration detected, deleting cloud-based replica...',
      );

      const resp = await deadropClient.vault[':name'].$delete({
        param: { name: vaultNameInput },
      });

      if (resp.status == 200)
        logInfo('Cloud-based replica deleted successfully!');
      else {
        console.log(await resp.json())
        logError(
          'Failed to delete cloud-based replica!\nCancelling deletion!',
        );

        return exit(1);
      }
    }

    await unlink(location);

    delete vaults[vaultNameInput];

    await saveConfig(configPath, { active_vault, vaults }, true);

    logInfo(`Vault '${vaultNameInput}' deleted succesfully!`);
  }

  return exit(0);
}
