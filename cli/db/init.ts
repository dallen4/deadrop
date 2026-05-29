import { createClient } from '@libsql/client';
import { initDBConfig } from '@shared/db/init';
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

  await client.$client.sync();

  return client;
};
