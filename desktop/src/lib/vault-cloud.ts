import { createClient } from '@shared/client';
import type { CloudVaultConfig } from '@shared/types/config';
import { DEADROP_API_URL } from '../env';

// Mirrors cli/actions/vault/create.ts's provisionCloudVault — POST /vault
// via the typed Hono client, using the Clerk session token from
// useApiHeaders() (same pattern drop/grab already use).
export async function provisionCloudVault(
  vaultNameInput: string,
  apiHeaders: Record<string, string>,
): Promise<CloudVaultConfig> {
  const client = createClient(DEADROP_API_URL, {
    init: { headers: apiHeaders },
  });

  const response = await client.vault.$post({
    json: { name: vaultNameInput },
  });

  if (response.status !== 201) {
    throw new Error(await response.text());
  }

  const { name, token } = await response.json();

  return { name, authToken: token };
}

export async function deleteCloudVault(
  vaultName: string,
  apiHeaders: Record<string, string>,
): Promise<void> {
  const client = createClient(DEADROP_API_URL, {
    init: { headers: apiHeaders },
  });

  const response = await client.vault[':name'].$delete({
    param: { name: vaultName },
  });

  if (response.status !== 200) {
    throw new Error(await response.text());
  }
}
