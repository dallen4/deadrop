import { initDB } from 'db/init';
import { vaultExists } from 'db/vaults';
import { loadConfig, saveConfig, vault } from 'lib/config';
import { VAULT_DIR_NAME } from 'lib/constants';
import { logError, logInfo } from 'lib/log';
import { resolve } from 'path';
import { cwd, exit } from 'process';

export async function vaultCreate(
  vaultNameInput: string,
  locationInput: string,
) {
  const { config } = await loadConfig();

  const { vaults } = config;

  if (!vaultNameInput) {
    logError('Vault name is required to delete!');
    return exit(1);
  }

  if (vaultExists(vaults, vaultNameInput)) {
    logError('Vault already exists!');
    return exit(1);
  }

  const dbLocation = locationInput ?? `${cwd()}/${VAULT_DIR_NAME}`;

  const newVaultLocation = resolve(
    dbLocation,
    `${vaultNameInput}.db`,
  );
  const newVault = vault(newVaultLocation);

  vaults[vaultNameInput] = newVault;

  initDB(newVaultLocation, newVault.key);

  config.active_vault = {
    name: vaultNameInput,
    environment: 'development',
  };

  await saveConfig(cwd(), { ...config }, true);

  logInfo(`Vault '${vaultNameInput}' created succesfully!`);
}
