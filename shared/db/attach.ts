import { createClient, type InValue } from '@libsql/client';
import { existsSync, rmSync } from 'fs';
import {
  ensureSecretsSchema,
  initDBConfig,
  syncWithRetry,
} from './init';
import { isReplica, prepareReplica, removeDbFiles } from './replica';
import { fileUrl } from '../lib/turso/utils';
import type { VaultDBConfig } from '../types/config';

// A local file can't become a v2 replica in place, so its rows are copied
// into one. Mirrors desktop's vault_attach_cloud.
export const cloudReplicaPath = (location: string) =>
  isReplica(location)
    ? location
    : `${location.replace(/\.db$/, '')}-cloud.db`;

const readSecrets = async (location: string) => {
  const client = createClient({ url: fileUrl(location) });
  try {
    const { rows } = await client.execute(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'secrets'",
    );
    if (!rows.length) return [];

    const secrets = await client.execute(
      'SELECT name, value, environment FROM secrets',
    );
    return secrets.rows.map(
      (r) => [r.name, r.value, r.environment] as InValue[],
    );
  } finally {
    client.close();
  }
};

// Returns the vault's new location. Cloud rows win on conflict; the
// original file stays behind as a backup.
export async function attachCloudVault(
  vault: VaultDBConfig,
): Promise<string> {
  if (!vault.cloud)
    throw new Error('Cloud config is required to attach a vault.');

  const { location } = vault;

  prepareReplica(location);
  if (!existsSync(location)) return location;

  const rows = await readSecrets(location);
  const replica = cloudReplicaPath(location);

  // Detached replicas have diverged from their sync metadata, so they
  // re-pull too. Keep a copy since the files get replaced in place.
  if (replica === location) {
    const backupPath = `${location.replace(/\.db$/, '')}-detached.db`;
    rmSync(backupPath, { force: true });

    const backup = createClient({ url: fileUrl(location) });
    try {
      await backup.execute({
        sql: 'VACUUM INTO ?',
        args: [backupPath],
      });
    } finally {
      backup.close();
    }
  }

  removeDbFiles(replica);

  const [config] = initDBConfig(replica, vault.cloud);
  const client = createClient(config);
  try {
    await syncWithRetry(client);
    await ensureSecretsSchema(client);
    if (rows.length) {
      await client.batch(
        rows.map((args) => ({
          sql: 'INSERT OR IGNORE INTO secrets (name, value, environment) VALUES (?, ?, ?)',
          args,
        })),
        'write',
      );
      await syncWithRetry(client);
    }
  } finally {
    client.close();
  }

  return replica;
}
