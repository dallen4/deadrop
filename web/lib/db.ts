import { createClient } from '@libsql/client-wasm';
import { initDBConfig } from '../../shared/db/init';
import { CloudVaultConfig } from '../../shared/types/config';
import { drizzle } from 'drizzle-orm/libsql/wasm';

export const initDBClient = async (
  path: string,
  encryptionKey: string,
  cloudConfig?: CloudVaultConfig,
) => {
  const [clientConfig, drizzleConfig] = initDBConfig(
    path,
    encryptionKey,
    cloudConfig,
  );

  const client = drizzle(createClient(clientConfig), drizzleConfig);

  await client.$client.sync();

  return client;
};
