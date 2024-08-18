import { LibSQLDatabase } from 'drizzle-orm/libsql/driver';

export type VaultDB = LibSQLDatabase;

export type VaultDBConfig = {
    location: string;
    key: string;
};

export type VaultStore = Record<string, VaultDBConfig>;

export type DeadropConfig = {
    active_vault: string;
    vaults: VaultStore;
};
