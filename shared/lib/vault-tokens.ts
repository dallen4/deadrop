import { z } from 'zod';

// The mint routes are the one place a worker-side field rename goes
// unnoticed: the CLI reads the JSON body straight into credentials, so a
// mismatch surfaces as an unauthenticated sync that injects nothing and
// still exits 0. Both ends derive their shape from here instead.

// `name` is the resolved remote database name, not the local label — the
// sync URL is derived from it (vaultSyncUrl), never stored.
export const MintedVaultCredsSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1),
  // Only the CI route returns one, from the key's claims.
  environment: z.string().min(1).optional(),
});

export const VaultApiKeyCredsSchema = MintedVaultCredsSchema.extend({
  environment: z.string().min(1),
});

export type MintedVaultCreds = z.infer<typeof MintedVaultCredsSchema>;

export type VaultApiKeyCreds = z.infer<typeof VaultApiKeyCredsSchema>;
