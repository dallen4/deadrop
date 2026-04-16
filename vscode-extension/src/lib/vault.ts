import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql/node';
import { eq, and } from 'drizzle-orm/expressions';
import { sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';
import { wrapSecret } from '@shared/lib/secrets';
import { vault as buildVaultConfig } from '@shared/lib/vault';
import type { VaultDBConfig } from '@shared/types/config';
import { mkdir } from 'fs/promises';
import * as path from 'path';

// Mirror the schema locally to avoid pulling in the full shared/db module
const secretsTable = sqliteTable(
  'secrets',
  {
    name: text('name').notNull(),
    value: text('value').notNull(),
    environment: text('environment').notNull(),
  },
  (table) => [primaryKey({ columns: [table.name, table.environment] })],
);

const RETRYABLE_SYNC_ERRORS = ['PrimaryHandshakeTimeout', 'Unavailable'];

async function syncWithRetry(
  client: { sync: () => Promise<unknown> },
  attemptsLeft = 8,
  delayMs = 750,
): Promise<void> {
  try {
    await client.sync();
  } catch (e) {
    const msg = (e as Error).message ?? '';
    const retryable = RETRYABLE_SYNC_ERRORS.some((s) => msg.includes(s));
    if (!retryable || attemptsLeft <= 1) throw e;
    await new Promise((r) => setTimeout(r, delayMs));
    return syncWithRetry(client, attemptsLeft - 1, delayMs);
  }
}

async function openDB(vault: VaultDBConfig) {
  const client = createClient({
    url: `file:${vault.location}`,
    ...(vault.cloud && {
      syncUrl: vault.cloud.syncUrl,
      authToken: vault.cloud.authToken,
    }),
  });
  const db = drizzle(client, { schema: { secrets: secretsTable } });
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

export async function listSecretNames(
  vault: VaultDBConfig,
): Promise<{ name: string; environment: string }[]> {
  const db = await openDB(vault);
  const rows = await db
    .select({ name: secretsTable.name, environment: secretsTable.environment })
    .from(secretsTable)
    .all();
  db.$client.close();
  return rows;
}

export async function fetchEncryptedSecret(
  vault: VaultDBConfig,
  name: string,
  environment: string,
): Promise<string | null> {
  const db = await openDB(vault);
  const [row] = await db
    .select({ value: secretsTable.value })
    .from(secretsTable)
    .where(
      and(eq(secretsTable.name, name), eq(secretsTable.environment, environment)),
    );
  db.$client.close();
  return row?.value ?? null;
}

export async function addSecret(
  vault: VaultDBConfig,
  name: string,
  value: string,
  environment: string,
): Promise<void> {
  const db = await openDB(vault);
  const encryptedValue = await wrapSecret(vault.environments[environment], value);
  await db.insert(secretsTable).values({ name, value: encryptedValue, environment });
  db.$client.close();
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

export async function updateSecret(
  vault: VaultDBConfig,
  name: string,
  value: string,
  environment: string,
): Promise<void> {
  const db = await openDB(vault);
  const encryptedValue = await wrapSecret(vault.environments[environment], value);
  await db
    .update(secretsTable)
    .set({ value: encryptedValue })
    .where(and(eq(secretsTable.name, name), eq(secretsTable.environment, environment)));
  db.$client.close();
}

export async function renameSecret(
  vault: VaultDBConfig,
  oldName: string,
  newName: string,
  environment: string,
): Promise<void> {
  const db = await openDB(vault);
  await db
    .update(secretsTable)
    .set({ name: newName })
    .where(and(eq(secretsTable.name, oldName), eq(secretsTable.environment, environment)));
  db.$client.close();
}

export async function deleteSecret(
  vault: VaultDBConfig,
  name: string,
  environment: string,
): Promise<void> {
  const db = await openDB(vault);
  await db
    .delete(secretsTable)
    .where(
      and(eq(secretsTable.name, name), eq(secretsTable.environment, environment)),
    );
  db.$client.close();
}
