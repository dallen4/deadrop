import { createClient } from '@shared/client';
import { vault } from '@shared/lib/vault';
import { syncUrl } from '@shared/lib/turso/utils';
import { migrateToCloudSync } from '@shared/db/migrate';
import type { CloudVaultConfig } from '@shared/types/config';
import type { CreateVaultResponse } from '@shared/types/fetch';
import { initDBClient } from 'db/init';
import { vaultExists } from 'db/vaults';
import { createClerkClient } from 'lib/auth/clerk';
import { loadConfig, saveConfig } from 'lib/config';
import { STORAGE_DIR_NAME } from '@shared/lib/constants';
import { logError, logInfo } from 'lib/log';
import { dirname, resolve } from 'path';
import { cwd, exit } from 'process';

async function provisionCloudVault(
  vaultNameInput: string,
  seed?: 'database_upload',
): Promise<CloudVaultConfig | null> {
  const clerkClient = await createClerkClient();

  if (!clerkClient.session) {
    logError('You must be signed in to create a cloud-synced vault!');
    return null;
  }

  try {
    logInfo('Cloud flag passed, creating cloud-synced instance');

    const sessionToken = await clerkClient.session.getToken();
    const deadropClient = createClient(process.env.DEADROP_API_URL!, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });

    const response = await deadropClient.vault.$post({
      json: { name: vaultNameInput, seed },
    });

    const data = await response.json();

    if (response.status !== 201) {
      logError(JSON.stringify(data));
      return null;
    }

    const { name, hostname, token: authToken } =
      data as CreateVaultResponse;

    return { name, syncUrl: syncUrl(hostname), authToken };
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function vaultCreate(
  vaultNameInput: string,
  locationInput?: string,
  options: { cloud?: boolean } = {},
) {
  const { config, filepath: configPath } = await loadConfig();

  const { vaults } = config;

  const existingVault = vaultExists(vaults, vaultNameInput);

  if (existingVault && (!options.cloud || existingVault.cloud)) {
    logError('Vault already exists!');
    return exit(1);
  }

  if (existingVault) {
    const cloud = await provisionCloudVault(
      vaultNameInput,
      'database_upload',
    );

    if (!cloud) return process.exit(1);

    existingVault.cloud = cloud;

    await migrateToCloudSync(existingVault);

    await saveConfig(
      dirname(configPath),
      { active_vault: config.active_vault, vaults },
      true,
    );

    logInfo(`Vault '${vaultNameInput}' upgraded to cloud sync!`);

    return process.exit(0);
  }

  const dbLocation = locationInput ?? `${cwd()}/${STORAGE_DIR_NAME}`;

  const newVaultLocation = resolve(
    dbLocation,
    `${vaultNameInput}.db`,
  );
  const newVault = await vault(newVaultLocation);

  if (options.cloud) {
    const cloud = await provisionCloudVault(vaultNameInput);

    if (!cloud) return process.exit(1);

    newVault.cloud = cloud;
  }

  vaults[vaultNameInput] = newVault;

  await initDBClient(newVault.location, newVault.cloud);

  const active_vault = {
    name: vaultNameInput,
    environment: 'development',
  };

  await saveConfig(
    dirname(configPath),
    { active_vault, vaults },
    true,
  );

  logInfo(`Vault '${vaultNameInput}' created succesfully!`);

  return process.exit(0);
}
