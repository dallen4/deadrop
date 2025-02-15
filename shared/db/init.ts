import { Client, Config } from '@libsql/client';
import { DrizzleConfig } from 'drizzle-orm';
import { formatCloudSyncUrl } from '../lib/util';
import { CloudVaultConfig } from '../types/config';
import { secretsTable } from './schema';
import { LibSQLDatabase } from 'drizzle-orm/libsql/driver-core';

export const initDBConfig = (
  path: string,
  encryptionKey: string,
  cloudConfig?: CloudVaultConfig,
) => {
  const config: Config = {
    url: `file:${path}`,
    encryptionKey,
  };

  if (cloudConfig) {
    config.syncUrl = formatCloudSyncUrl(cloudConfig.name);
    config.authToken = cloudConfig.authToken;
  }

  return [config, { schema: { secrets: secretsTable } }] as [
    Config,
    DrizzleConfig<{ secrets: typeof secretsTable }>,
  ];
};

export type DBClient = LibSQLDatabase<{
  secrets: typeof secretsTable;
}> & {
  $client: Client;
};
