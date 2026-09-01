import { createClient } from '@shared/client';
import {
  MintedVaultCreds,
  MintedVaultCredsSchema,
  VaultApiKeyCreds,
  VaultApiKeyCredsSchema,
} from '@shared/lib/vault-tokens';
import { VaultDBConfig } from '@shared/types/config';
import { z, ZodTypeAny } from 'zod';
import { getSessionToken } from './clerk';

export type { MintedVaultCreds, VaultApiKeyCreds };

export class VaultNotFoundError extends Error {}

// How this run obtains its Turso token. Resolved once, up front, so every
// inject path mints in exactly one place.
export enum MintStrategy {
  // Machine credential (DEADROP_API_KEY) → POST /vault/tokens/ci.
  ApiKey = 'api-key',
  // Interactive Clerk session → POST /vault/tokens.
  Session = 'session',
  // The vault already carries a usable token; nothing to mint.
  Cached = 'cached',
  // Local-only vault, no cloud config — never syncs.
  None = 'none',
}

// The already-resolved half of a vault, so callers pass what they built
// rather than restating it.
export type MintStrategyInput = {
  // Ephemeral runs own a throwaway replica, so they always sync from cloud.
  ephemeral: boolean;
  vault: Pick<VaultDBConfig, 'cloud'>;
};

export const resolveMintStrategy = (
  { ephemeral, vault }: MintStrategyInput,
  refreshToken?: boolean,
): MintStrategy => {
  if (!ephemeral && !vault.cloud) return MintStrategy.None;

  // An API key can't supply DEADROP_VAULT_KEY, so it's only useful where CI
  // already provided one — never against a config-backed vault.
  if (ephemeral && process.env.DEADROP_API_KEY)
    return MintStrategy.ApiKey;

  // Ephemeral replicas have no token cache, which is what makes
  // --refresh-token inert there by construction rather than by a guard.
  if (vault.cloud?.authToken && !refreshToken)
    return MintStrategy.Cached;

  return MintStrategy.Session;
};

const vaultClient = (cred: string) =>
  createClient(process.env.DEADROP_API_URL!, {
    headers: { Authorization: `Bearer ${cred}` },
  });

// Parsed rather than cast: the body decides whether the sync authenticates,
// so a shape that drifts has to fail here instead of downstream as an empty
// vault.
async function handleResponse<Schema extends ZodTypeAny>(
  response: Response,
  schema: Schema,
): Promise<z.infer<Schema>> {
  if (response.status === 404) {
    const { error } = (await response.json()) as { error: string };
    throw new VaultNotFoundError(error);
  } else if (response.status !== 201)
    throw new Error('Failed to mint vault token!');

  const parsed = schema.safeParse(await response.json());

  if (!parsed.success)
    throw new Error('Malformed vault token response!');

  return parsed.data;
}

export async function mintVaultTokenWithApiKey(
  apiKey?: string,
): Promise<VaultApiKeyCreds> {
  const cred = apiKey ?? process.env.DEADROP_API_KEY;

  if (!cred) throw new Error('No API key provided!');

  const deadropClient = vaultClient(cred);

  const response = await deadropClient.vault.tokens.ci.$post();

  return handleResponse(response, VaultApiKeyCredsSchema);
}

export async function mintVaultToken(
  vaultName: string,
): Promise<MintedVaultCreds> {
  const token = await getSessionToken();

  if (!token) throw new Error('No session token found!');

  const deadropClient = vaultClient(token);

  const response = await deadropClient.vault.tokens.$post({
    json: vaultName ? { name: vaultName } : {},
  });

  return handleResponse(response, MintedVaultCredsSchema);
}
