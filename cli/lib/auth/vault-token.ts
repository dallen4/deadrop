import { createClient } from '@shared/client';
import { getSessionToken } from './clerk';

export class VaultNotFoundError extends Error {}

// `name` is the resolved remote database name, not the local label — the
// sync URL is derived from it (vaultSyncUrl), never stored.
export type MintedVaultCreds = { authToken: string; name: string };

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

  const { token: authToken, name } = (await response.json()) as {
    token: string;
    name: string;
  };
  return { authToken, name };
}
