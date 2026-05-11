import { Client, Config } from '@libsql/client';
import { DrizzleConfig } from 'drizzle-orm';
import { CloudVaultConfig } from '../types/config';
import { secretsTable } from './schema';
import { fileUrl } from '../lib/turso';
import { LibSQLDatabase } from 'drizzle-orm/libsql';

export const initDBConfig = (
  path: string,
  cloudConfig?: CloudVaultConfig,
) => {
  const config: Config = {
    url: fileUrl(path),
  };

  if (cloudConfig) {
    config.syncUrl = cloudConfig.syncUrl;
    config.authToken = cloudConfig.authToken;
  }

  return [config, { schema: { secrets: secretsTable } }] as [
    Config,
    DrizzleConfig<{ secrets: typeof secretsTable }>,
  ];
};

export type DBClient<
  TSchema extends Record<string, unknown> = {
    secrets: typeof secretsTable;
  },
> = LibSQLDatabase<TSchema> & {
  $client: Client;
};

const RETRYABLE_SYNC_ERRORS = [
  'PrimaryHandshakeTimeout',
  'Unavailable',
];

export async function syncWithRetry(
  client: { sync: () => Promise<unknown> },
  attemptsLeft = 8,
  delayMs = 750,
): Promise<void> {
  try {
    await client.sync();
  } catch (e) {
    const msg = (e as Error).message ?? '';
    const retryable = RETRYABLE_SYNC_ERRORS.some((s) =>
      msg.includes(s),
    );
    if (!retryable || attemptsLeft <= 1) throw e;
    await new Promise((r) => setTimeout(r, delayMs));
    return syncWithRetry(client, attemptsLeft - 1, delayMs);
  }
}
