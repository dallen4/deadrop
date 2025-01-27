import { createClient } from '@shared/client';
import { vault } from '@shared/lib/vault';
import { randomBytes } from 'crypto';
import { initDB } from 'db/init';
import { vaultExists } from 'db/vaults';
import { createClerkClient } from 'lib/auth/clerk';
import { loadConfig, saveConfig } from 'lib/config';
import { STORAGE_DIR_NAME } from 'lib/constants';
import { logError, logInfo } from 'lib/log';
import { resolve } from 'path';
import { cwd, exit } from 'process';

export async function vaultCreate(
  vaultNameInput: string,
  locationInput?: string,
  options: { cloud?: boolean } = {},
) {
  const { config, filepath: configPath } = await loadConfig();

  const { vaults } = config;

  if (vaultExists(vaults, vaultNameInput)) {
    logError('Vault already exists!');
    return exit(1);
  }

  const dbLocation = locationInput ?? `${cwd()}/${STORAGE_DIR_NAME}`;

  const newVaultLocation = resolve(
    dbLocation,
    `${vaultNameInput}.db`,
  );
  const newVault = await vault(
    newVaultLocation,
    randomBytes(32).toString('base64'),
  );

  if (options.cloud) {
    const clerkClient = await createClerkClient();

    if (!clerkClient.session) {
      logError(
        'You must be signed in to create a cloud-synced vault!',
      );

      return process.exit(1);
    }

    try {
      logInfo('Cloud flag passed, creating cloud-synced instance');

      const sessionToken = await clerkClient.session.getToken();
      const deadropClient = createClient(
        process.env.DEADROP_API_URL!,
        {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        },
      );

      const response = await deadropClient.vault.$post({
        json: { name: vaultNameInput },
      });

      const data = await response.json();

      if (response.status !== 201) {
        logError(JSON.stringify(data));
        // throw error
        return process.exit(1);
      }

      const { name, token: authToken } = data as {
        name: string;
        token: string;
      };

      newVault.cloud = {
        name,
        authToken,
      };
    } catch (err) {
      console.error(err);

      return process.exit(1);
    }
  }

  vaults[vaultNameInput] = newVault;

  await initDB(newVault.location, newVault.key, newVault.cloud);

  const active_vault = {
    name: vaultNameInput,
    environment: 'development',
  };

  await saveConfig(configPath, { active_vault, vaults }, true);

  logInfo(`Vault '${vaultNameInput}' created succesfully!`);

  return process.exit(0);
}
