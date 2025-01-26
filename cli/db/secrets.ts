import { VaultDBConfig } from '@shared/types/config';
import { initDB } from './init';
import { and, eq } from 'drizzle-orm/expressions';
import { SecretsInput, secretsTable } from './schema';
import { unwrapSecret, wrapSecret } from '@shared/lib/secrets';

export async function createSecretsHelpers(vault: VaultDBConfig) {
  const { location, key, cloud } = vault;

  const db = await initDB(location, key, cloud);

  const addSecrets = async (inputs: SecretsInput[]) => {
    const secretsToAdd: SecretsInput[] = await Promise.all(
      inputs.map(async ({ name, value, environment }) => ({
        name,
        value: await wrapSecret(
          vault.environments[environment],
          value,
        ),
        environment,
      })),
    );

    return db.insert(secretsTable).values(secretsToAdd).returning();
  };

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

    const decryptionKey = vault.environments[environment];

    return unwrapSecret(decryptionKey, secret.value);
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

    const decryptionKey = vault.environments[environment];

    const decryptedSecrets = await Promise.all(
      secretItems.map((item) =>
        unwrapSecret(decryptionKey, item.value),
      ),
    );

    return secretItems.reduce(
      (prev, { name }, index) => ({
        ...prev,
        [name]: decryptedSecrets[index],
      }),
      {},
    );
  };

  return {
    addSecrets,
    getSecret,
    removeSecret,
    getAllSecrets,
  };
}
