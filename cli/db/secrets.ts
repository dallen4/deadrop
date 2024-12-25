import { VaultDBConfig } from 'types/config';
import { initDB } from './init';
import { and, eq } from 'drizzle-orm/expressions';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { SecretsInput, secretsTable } from './schema';

export async function createSecretsHelpers(vault: VaultDBConfig) {
  const { location, key, cloud } = vault;

  const db = await initDB(location, key, cloud);

  const runMigrations = () =>
    migrate(db, { migrationsFolder: './db/migrations' });

  const addSecrets = async (inputs: SecretsInput[]) =>
    db.insert(secretsTable).values(inputs).returning();

  const getSecret = async (name: string, environment: string) => {
    const [secret] = await db
      .select()
      .from(secretsTable)
      .where(
        and(
          eq(secretsTable.name, name),
          eq(secretsTable.environment, environment),
        ),
      );

    // TODO unwrap

    return secret;
  };

  const removeSecret = async (name: string) =>
    db.delete(secretsTable).where(eq(secretsTable.name, name));

  const getAllSecrets = async (
    environment: string,
  ): Promise<Record<string, string>> => {
    const secretItems = await db
      .select()
      .from(secretsTable)
      .where(eq(secretsTable.environment, environment))
      .all();

    // TODO unwrap
    return secretItems.reduce(
      (prev, { name, value }) => ({
        ...prev,
        [name]: value,
      }),
      {},
    );
  };

  return {
    runMigrations,
    addSecrets,
    getSecret,
    removeSecret,
    getAllSecrets,
  };
}
