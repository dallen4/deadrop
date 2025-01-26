import { Config, createClient } from '@libsql/client';
import { formatCloudSyncUrl } from '@shared/lib/util';
import { drizzle } from 'drizzle-orm/libsql';
import { CloudVaultConfig } from '@shared/types/config';

export const initDB = async (
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

  return drizzle(createClient(config));
};
