import { createClient } from '@shared/client';
import type { VaultTokenAccess } from '@shared/lib/constants';
import type { CloudVaultConfig } from '@shared/types/config';
import { DEADROP_API_URL } from '../env';

// Mirrors cli/actions/vault/create.ts's provisionCloudVault — POST /vault
// via the typed Hono client, using the Clerk session token from
// useApiHeaders() (same pattern drop/grab already use).
// An empty name is NOT the same as no name: the worker's
// vaultNameFromUserId drops falsy suffixes, so '' silently resolves to the
// bare `<hash13>` default vault instead of `<hash13>-<name>`.
const requireVaultName = (name: string) => {
  if (!name.trim())
    throw new Error('A vault name is required for cloud sync.');

  return name;
};

export async function provisionCloudVault(
  vaultNameInput: string,
  apiHeaders: Record<string, string>,
): Promise<CloudVaultConfig> {
  requireVaultName(vaultNameInput);

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

// A vault detached from sync still exists at Turso, so re-enabling looks
// it up first and mints a fresh credential instead of provisioning anew.
export async function findCloudVaultName(
  vaultName: string,
  apiHeaders: Record<string, string>,
): Promise<string | null> {
  requireVaultName(vaultName);

  const client = createClient(DEADROP_API_URL, {
    init: { headers: apiHeaders },
  });

  const response = await client.vault[':name'].$get({
    param: { name: vaultName },
  });

  if (response.status !== 200) return null;

  const { vault } = await response.json();

  return vault?.Name ?? null;
}

export async function issueVaultToken(
  vaultName: string,
  access: VaultTokenAccess,
  expiration: string | undefined,
  apiHeaders: Record<string, string>,
): Promise<string> {
  const client = createClient(DEADROP_API_URL, {
    init: { headers: apiHeaders },
  });

  const response = await client.vault.tokens.$post({
    json: { name: vaultName, access, expiration },
  });

  if (response.status !== 201) {
    throw new Error(await response.text());
  }

  const { token } = await response.json();

  return token;
}

// Turso has no single-token revoke, so this kills every token for the
// database — callers must mint a replacement to keep their own sync alive.
export async function rotateVaultTokens(
  vaultName: string,
  apiHeaders: Record<string, string>,
): Promise<void> {
  const client = createClient(DEADROP_API_URL, {
    init: { headers: apiHeaders },
  });

  const response = await client.vault.rotate.$post({
    json: { name: vaultName },
  });

  if (response.status !== 200) {
    throw new Error(await response.text());
  }
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
