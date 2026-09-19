import { z } from 'zod';

// inject spawns the command with an env block, so `=` and whitespace are
// the only structural limits; shell identifier rules are a usability
// concern the UI warns about, not a block.
export const VaultInjectOptionsSchema = z.object({
  prefix: z
    .string()
    .min(1)
    .regex(/^[^=\s\0]+$/, 'No whitespace or "=".')
    .optional(),
  // `min(1)` rather than `nonempty()`: same check, but it infers string[]
  // instead of a tuple nothing else here can satisfy.
  only: z.array(z.string().min(1)).min(1).optional(),
});

// Pairs so a caller zipping values back cannot desync from the names.
export function resolveInjectedNames(
  available: string[],
  { only, prefix }: VaultInjectOptions,
): [stored: string, injected: string][] {
  return (only ?? available).map((name) => [
    name,
    `${prefix ?? ''}${name}`,
  ]);
}

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
