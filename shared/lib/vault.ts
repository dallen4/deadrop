import { DeadropConfig, VaultDBConfig } from '../types/config';
import { exportKeyToBase64, generateKey } from './crypto/operations';

export async function initEnvKey() {
  const environmentKey = await generateKey();

  return exportKeyToBase64(environmentKey);
}

export const vault = async (
  path: string,
): Promise<VaultDBConfig> => ({
  location: path,
  environments: {
    development: await initEnvKey(),
  },
});

export const initConfig = async (
  defaultVaultPath: string,
): Promise<DeadropConfig> => ({
  active_vault: {
    name: 'default',
    environment: 'development',
  },
  vaults: {
    default: await vault(defaultVaultPath),
  },
});
