import { createClient } from '@libsql/client';
import {
  ensureSecretsSchema,
  initDBConfig,
  syncWithRetry,
} from '@shared/db/init';
import { prepareReplica } from '@shared/db/replica';
import { CloudVaultConfig } from '@shared/types/config';
import { drizzle } from 'drizzle-orm/libsql/node';

export const initDBClient = async (
  path: string,
  cloudConfig?: CloudVaultConfig,
  sync: boolean = true,
) => {
  if (cloudConfig && sync) prepareReplica(path);

  const [config, drizzleConfig] = initDBConfig(
    path,
    cloudConfig,
    sync,
  );

  const client = drizzle(createClient(config), drizzleConfig);

  // Replication and CREATE TABLE are both writes a read-only token blocks.
  if (cloudConfig) {
    if (sync) await syncWithRetry(client.$client);
  } else await ensureSecretsSchema(client.$client);

  return client;
};
