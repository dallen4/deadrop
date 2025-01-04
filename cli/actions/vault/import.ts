import { vaultExists } from 'db/vaults';
import { loadConfig } from 'lib/config';
import { addEnvToVault } from 'lib/env';
import { logError, logInfo } from 'lib/log';
import { exit } from 'process';

export async function vaultImport(envPath: string) {
  const { config } = await loadConfig();

  const { vaults, active_vault } = config;

  const { key } = vaults[active_vault.name];

  const vaultConfig = vaultExists(vaults, active_vault.name);

  if (!vaultConfig) {
    logError('Default vault could not be found!');
    return exit(1);
  }

  const newSecrets = await addEnvToVault(
    envPath,
    active_vault.environment,
    vaultConfig,
  );

  logInfo(
    `${newSecrets.length} secrets added to vault from '${envPath}'!`,
  );
}
