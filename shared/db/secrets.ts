import { and, eq } from 'drizzle-orm/expressions';
import { VaultDBConfig } from '../types/config';
import { DBClient, syncWithRetry } from './init';
import { SecretsInput, secretsTable } from './schema';
import { unwrapSecret, wrapSecret } from '../lib/secrets';

export function createSecretsHelpers(
  vault: VaultDBConfig,
  db: DBClient,
) {
  const sync = async () => {
    if (vault.cloud) await syncWithRetry(db.$client);
  };

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

    const result = await db
      .insert(secretsTable)
      .values(secretsToAdd)
      .returning();
    await sync();
    return result;
  };

  const updateSecret = async (input: SecretsInput) => {
    const wrappedSecret = await wrapSecret(
      vault.environments[input.environment],
      input.value,
    );

    const [updatedSecret] = await db
      .update(secretsTable)
      .set({ value: wrappedSecret })
      .where(
        and(
          eq(secretsTable.name, input.name),
          eq(secretsTable.environment, input.environment),
        ),
      )
      .returning();

    await sync();
    return updatedSecret;
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

  const listSecretNames = async (): Promise<
    Array<{ name: string; environment: string }>
  > => {
    return db
      .select({
        name: secretsTable.name,
        environment: secretsTable.environment,
      })
      .from(secretsTable)
      .all();
  };

  const getEncryptedSecret = async (
    name: string,
    environment: string,
  ): Promise<string | null> => {
    const [row] = await db
      .select({ value: secretsTable.value })
      .from(secretsTable)
      .where(
        and(
          eq(secretsTable.name, name),
          eq(secretsTable.environment, environment),
        ),
      );
    return row?.value ?? null;
  };

  const renameSecret = async (
    oldName: string,
    newName: string,
    environment: string,
  ) => {
    await db
      .update(secretsTable)
      .set({ name: newName })
      .where(
        and(
          eq(secretsTable.name, oldName),
          eq(secretsTable.environment, environment),
        ),
      );
    await sync();
  };

  const removeSecret = async (name: string, environment?: string) => {
    const conditions = [eq(secretsTable.name, name)];
    if (environment)
      conditions.push(eq(secretsTable.environment, environment));

    const result = await db
      .delete(secretsTable)
      .where(and(...conditions));
    await sync();
    return result;
  };

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
    updateSecret,
    getSecret,
    getEncryptedSecret,
    listSecretNames,
    renameSecret,
    removeSecret,
    getAllSecrets,
  };
}
