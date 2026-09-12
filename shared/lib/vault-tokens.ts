import { z } from 'zod';

export const VaultInjectOptionsSchema = z.object({
  prefix: z.string().optional(),
  only: z.array(z.string()).optional(),
});

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
}).and(VaultInjectOptionsSchema);

export type VaultInjectOptions = z.infer<
  typeof VaultInjectOptionsSchema
>;

export type MintedVaultCreds = z.infer<typeof MintedVaultCredsSchema>;

export type VaultApiKeyCreds = z.infer<typeof VaultApiKeyCredsSchema>;
