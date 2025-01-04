import { existsSync } from 'fs';
import { VaultStore } from 'types/config';

export const vaultExists = (vaults: VaultStore, name: string) => {
  const config = vaults[name];

  if (!config) return null;

  let dbExists = config
    ? existsSync(config.location)
    : false;

  // TODO convert to async and check if db exists on turso
  if (config.cloud) {}

  return dbExists ? config : null;
};
