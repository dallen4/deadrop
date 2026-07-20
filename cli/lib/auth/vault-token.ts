import { createClient } from '@shared/client';
import { syncUrl as toSyncUrl } from '@shared/lib/turso/utils';
import { getSessionToken } from './clerk';

export class VaultNotFoundError extends Error {}

export type MintedVaultCreds = { authToken: string; syncUrl: string };

export async function mintVaultToken(
  vaultName?: string,
): Promise<MintedVaultCreds | null> {
  const token = await getSessionToken();
  if (!token) return null;

  const deadropClient = createClient(process.env.DEADROP_API_URL!, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const response = await deadropClient.vault.tokens.$post({
    json: vaultName ? { name: vaultName } : {},
  });

  if (response.status === 404) {
    const { error } = (await response.json()) as { error: string };
    throw new VaultNotFoundError(error);
  }
  if (response.status !== 201) return null;

  const { token: authToken, hostname } = (await response.json()) as {
    token: string;
    hostname: string;
  };
  return { authToken, syncUrl: toSyncUrl(hostname) };
}
