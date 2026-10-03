/** One key/value pair in a bulk KV write. */
export type KvEntry = {
  key: string;
  value: string;
  expiration_ttl?: number;
};

/** Canonical record for one Clerk user. */
export type UserRecord = {
  userId: string;
  /** sha256(userId)[0:13] — the prefix every one of their databases carries. */
  vaultPrefix: string;
  vaultCount: number;
  syncedAt: string;
};

/** Canonical record for one vault, nested under its owner. */
export type VaultRecord = {
  userId: string;
  /** The vault's short name, e.g. `default`. */
  name: string;
  /** The Turso database name, i.e. `<vaultPrefix><name>`. */
  databaseName: string;
  syncedAt: string;
};

/** Reverse index resolving a Turso database name back to its owner. */
export type VaultOwnerRecord = {
  userId: string;
  name: string;
};
