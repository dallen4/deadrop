import { createClient } from '@libsql/client';
import {
  ensureSecretsSchema,
  initDBConfig,
  syncWithRetry,
} from '@shared/db/init';
import { CloudVaultConfig } from '@shared/types/config';
import { drizzle } from 'drizzle-orm/libsql/node';

export const initDBClient = async (
  path: string,
  cloudConfig?: CloudVaultConfig,
) => {
  const [config, drizzleConfig] = initDBConfig(
    path,
    cloudConfig,
  );

  const client = drizzle(createClient(config), drizzleConfig);

  // Cloud vaults sync their schema from Turso; local file dbs can't sync.
  if (cloudConfig) await syncWithRetry(client.$client);

  await ensureSecretsSchema(client.$client);

  return client;
};
