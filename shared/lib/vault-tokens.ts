import { z } from 'zod';

// `name` is the resolved remote database name, not the local label —
// vaultSyncUrl derives the sync URL from it.
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
