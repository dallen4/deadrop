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
  const [config, drizzleConfig] = initDBConfig(path, cloudConfig);

  const client = drizzle(createClient(config), drizzleConfig);

  // Turso provisions the table; a read-only token forbids the write.
  if (cloudConfig) await syncWithRetry(client.$client);
  else await ensureSecretsSchema(client.$client);

  return client;
};
