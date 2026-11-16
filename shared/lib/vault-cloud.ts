import type { DeadropApiClient } from '../client';
import { VaultTokenAccess } from './constants';
import type { CloudVaultConfig } from '../types/config';

// Turning sync off is local only, so the Turso database outlives it.
// Reattach to it with a fresh token before provisioning a new one.
export async function connectCloudVault(
  client: DeadropApiClient,
  vaultName: string,
): Promise<CloudVaultConfig> {
  // '' resolves to the bare `<hash13>` default vault at the worker.
  if (!vaultName.trim())
    throw new Error('A vault name is required for cloud sync.');

  const found = await client.vault[':name'].$get({
    param: { name: vaultName },
  });
  const existing =
    found.status === 200 ? (await found.json()).vault?.Name : null;

  if (existing) {
    const res = await client.vault.tokens.$post({
      json: { name: vaultName, access: VaultTokenAccess.FullAccess },
    });
    if (res.status !== 201) throw new Error(await res.text());

    const { token } = await res.json();
    return { name: existing, authToken: token };
  }

  const res = await client.vault.$post({ json: { name: vaultName } });
  if (res.status !== 201) throw new Error(await res.text());

  const { name, token } = await res.json();
  return { name, authToken: token };
}
