import { existsSync } from 'fs';
import { VaultStore } from 'types/config';

export const vaultExists = (vaults: VaultStore, name: string) => {
  const dbExists = vaults[name]
    ? existsSync(vaults[name].location)
    : false;

  return dbExists ? vaults[name].location : null;
};
