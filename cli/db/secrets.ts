import { VaultDBConfig } from 'types/config';
import { initDB } from './init';
import { eq } from 'drizzle-orm/expressions';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { secretsTable } from './schema';

export function createSecretsHelpers({
  location,
  key,
}: VaultDBConfig) {
  const db = initDB(location, key);

  const runMigrations = () =>
    migrate(db, { migrationsFolder: './db/migrations' });

  const createSecret = async (name: string, value: string) => {
    const [newSecret] = await db
      .insert(secretsTable)
      .values({
        name,
        value,
      })
      .returning();

    return newSecret;
  };

  const getSecret = async (name: string) => {
    const [secret] = await db
      .select()
      .from(secretsTable)
      .where(eq(secretsTable.name, name));

    return secret;
  };

  const removeSecret = async (name: string) =>
    db.delete(secretsTable).where(eq(secretsTable.name, name));

  const getAllSecrets = async () =>
    db.select().from(secretsTable).all();

  return {
    runMigrations,
    createSecret,
    getSecret,
    removeSecret,
    getAllSecrets,
  };
}
