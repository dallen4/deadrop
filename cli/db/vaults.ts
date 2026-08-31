import { existsSync } from 'fs';
import { VaultStore } from '@shared/types/config';

export const vaultExists = (vaults: VaultStore, name: string) => {
  const config = vaults[name];

  if (!config) return null;

  const dbExists = existsSync(config.location);

  // TODO convert to async and check if db exists on turso
  // if (config.cloud) {}

  return dbExists ? config : null;
};
