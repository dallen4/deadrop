import { vaultExists } from 'db/vaults';
import { loadConfig } from 'lib/config';
import { addEnvToVault } from 'lib/env';
import { logError, logInfo } from 'lib/log';
import { exit } from 'process';

export async function vaultImport(envPath: string) {
  const { config } = await loadConfig();

  const { vaults, active_vault } = config;

  const { key } = vaults[active_vault];

  const location = vaultExists(vaults, active_vault);

  if (!location) {
    logError('Default vault could not be found!');
    return exit(1);
  }

  const newSecrets = await addEnvToVault(envPath, { key, location });

  logInfo(
    `${newSecrets.rowsAffected} secrets added to vault from '${envPath}'!`,
  );
}
