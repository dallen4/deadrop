import { LibSQLDatabase } from 'drizzle-orm/libsql/driver';

export type VaultDB = LibSQLDatabase;

export type ActiveVaultConfig = {
  name: string;
  environment: string;
};

export type VaultEnvironments = {
  [environment: string]: string;
};

// `name` is the full prefixed remote database name, so the sync URL is
// derived (vaultSyncUrl) rather than stored. `authToken` is retained: for a
// vault you don't own it can't be reminted, so it's the only way in.
export type CloudVaultConfig = {
  name: string;
  authToken?: string;
};

export type VaultDBConfig = {
  location: string;
  environments: VaultEnvironments;
  cloud?: CloudVaultConfig;
};

export type VaultStore = Record<string, VaultDBConfig>;

// A vault in a drop payload: the recipient supplies `location` themselves.
export type SharedVault = Omit<VaultDBConfig, 'location'> & {
  cloud: CloudVaultConfig;
};

export type DeadropConfig = {
  active_vault: ActiveVaultConfig;
  vaults: VaultStore;
};
