import { loadConfig, saveConfig } from 'lib/config';
import { logError, logInfo } from 'lib/log';
import { dirname } from 'path';
import { exit } from 'process';
import { vaultExists } from 'db/vaults';
import { initEnvKey } from '@shared/lib/vault';

export async function vaultEnvList() {
  const { config } = await loadConfig();

  const { vaults, active_vault } = config;

  const activeVault = vaultExists(vaults, active_vault.name);

  if (!activeVault) {
    logError('Active vault not found!');
    return exit(1);
  }

  const environments = Object.keys(activeVault.environments);

  environments.forEach((environment) =>
    logInfo(
      environment === active_vault.environment
        ? `* ${environment}`
        : `  ${environment}`,
    ),
  );

  return exit(0);
}

export async function vaultEnvAdd(name: string) {
  const { config, filepath: configPath } = await loadConfig();

  const { vaults, active_vault } = config;

  const activeVault = vaultExists(vaults, active_vault.name);

  if (!activeVault) {
    logError('Active vault not found!');
    return exit(1);
  }

  if (activeVault.environments[name]) {
    logError(`Environment '${name}' already exists!`);
    return exit(1);
  }

  activeVault.environments[name] = await initEnvKey();

  await saveConfig(
    dirname(configPath),
    { active_vault, vaults },
    true,
  );

  logInfo(
    `Environment '${name}' added to vault '${active_vault.name}'!`,
  );

  return exit(0);
}
