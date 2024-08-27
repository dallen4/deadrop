import { VaultDBConfig } from 'types/config';
import { initDB } from './init';
import { eq } from 'drizzle-orm/expressions';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { SecretsInput, secretsTable } from './schema';

export function createSecretsHelpers({
  location,
  key,
}: VaultDBConfig) {
  console.log(location);
  const db = initDB(location, key);

  const runMigrations = () =>
    migrate(db, { migrationsFolder: './db/migrations' });

  const addSecrets = async (inputs: SecretsInput[]) => {
    const [newSecret] = await db
      .insert(secretsTable)
      .values(inputs)
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
    addSecrets,
    getSecret,
    removeSecret,
    getAllSecrets,
  };
}
