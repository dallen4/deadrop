import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql/node';
import { initDBConfig, syncWithRetry } from './init';
import { secretsTable } from './schema';
import { fileUrl, tursoUploadUrl } from '../lib/turso';
import type { VaultDBConfig } from '../types/config';
import { readFile, unlink } from 'fs/promises';

/**
 * Migrate an existing local-only vault DB to a
 * cloud-synced embedded replica.
 *
 * libsql requires a metadata file alongside the .db when
 * syncUrl is set. A DB created locally won't have one, so
 * we upload the raw .db file to the Turso database 
 * (created with seed type "database_upload"), delete the
 * local files, and re-open as an embedded replica that 
 * syncs down from cloud.
 */
export async function migrateToCloudSync(
  vault: VaultDBConfig,
): Promise<void> {
  if (!vault.cloud)
    throw new Error(
      'Cloud config is required for migration.',
    );

  const dbPath = vault.location;

  // 1. Ensure WAL mode + 4096 page size (Turso upload reqs)
  const prepClient = createClient({ url: fileUrl(dbPath) });
  await prepClient.execute('PRAGMA journal_mode=WAL');
  await prepClient.execute('PRAGMA page_size=4096');
  await prepClient.execute('VACUUM');
  prepClient.close();

  // 2. Upload the local .db file to Turso
  const dbBytes = await readFile(dbPath);
  const uploadUrl = tursoUploadUrl(vault.cloud.syncUrl);

  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${vault.cloud.authToken}`,
      'Content-Length': String(dbBytes.byteLength),
    },
    body: dbBytes,
  });

  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    throw new Error(
      `DB upload failed (${uploadRes.status}): ${text}`,
    );
  }

  // 3. Remove local DB files (db, WAL, SHM)
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      await unlink(dbPath + suffix);
    } catch {
      // file may not exist, that's fine
    }
  }

  // 4. Re-open as embedded replica — fresh .db + metadata
  const [config] = initDBConfig(dbPath, vault.cloud);
  const client = createClient(config);
  const db = drizzle(client, {
    schema: { secrets: secretsTable },
  });
  await syncWithRetry(db.$client);
  db.$client.close();
}
