import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql/node';
import { initDBConfig, syncWithRetry } from '@shared/db/init';
import { createSecretsHelpers } from '@shared/db/secrets';
import { secretsTable } from '@shared/db/schema';
import { vault as buildVaultConfig } from '@shared/lib/vault';
import type { VaultDBConfig } from '@shared/types/config';
import { mkdir } from 'fs/promises';
import * as path from 'path';

export { migrateToCloudSync } from '@shared/db/migrate';

async function openDB(vault: VaultDBConfig) {
  const [config] = initDBConfig(vault.location, vault.cloud);
  const client = createClient(config);
  const db = drizzle(client, {
    schema: { secrets: secretsTable },
  });
  if (vault.cloud) await syncWithRetry(db.$client);
  await db.$client.execute(
    `CREATE TABLE IF NOT EXISTS secrets (
      name TEXT NOT NULL,
      value TEXT NOT NULL,
      environment TEXT NOT NULL,
      PRIMARY KEY (name, environment)
    )`,
  );
  return db;
}

export type SecretsHelpers = ReturnType<
  typeof createSecretsHelpers
>;

export function openVaultHelpers(vault: VaultDBConfig) {
  return {
    async run<T>(
      fn: (helpers: SecretsHelpers) => Promise<T>,
    ): Promise<T> {
      const db = await openDB(vault);
      try {
        return await fn(
          createSecretsHelpers(vault, db),
        );
      } finally {
        db.$client.close();
      }
    },
  };
}

export async function createVaultDB(
  vaultName: string,
  workspaceRoot: string,
): Promise<VaultDBConfig> {
  const storageDir = path.join(workspaceRoot, '.deadrop');
  await mkdir(storageDir, { recursive: true });
  const location = path.join(storageDir, `${vaultName}.db`);
  return buildVaultConfig(location);
}
