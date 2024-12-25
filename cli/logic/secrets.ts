import { SecretsInput } from 'db/schema';
import { createSecretsHelpers } from 'db/secrets';
import { wrapSecret } from 'lib/crypto';
import { VaultDBConfig } from 'types/config';

export async function addSecretsToVault(
  vault: VaultDBConfig,
  secrets: SecretsInput[],
) {
  const secretWrapping: Promise<SecretsInput>[] = secrets.map(
    async ({ name, value, environment }) => ({
      name,
      value: await wrapSecret(
        vault.environments![environment],
        value,
      ),
      environment,
    }),
  );

  const secretsToAdd: SecretsInput[] = await Promise.all(
    secretWrapping,
  );

  const { addSecrets } = await createSecretsHelpers(vault);

  return addSecrets(secretsToAdd);
}
