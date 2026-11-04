import { VaultTokenAccess } from '@shared/lib/constants';
import { VaultInjectOptionsSchema } from '@shared/lib/vault-tokens';
import { VAULT_NAME_PATTERN } from '@shared/lib/turso/utils';
import z from 'zod';

const VaultName = z.string().trim().regex(VAULT_NAME_PATTERN);
// Turso duration, e.g. `5m`, `30d`, `2w1d`, or `never`.
const Expiration = z.string().regex(/^(never|(\d+[smhdw])+)$/);

export const VaultNameSchema = z.object({ name: VaultName });
export const CreateVaultSchema = VaultNameSchema.partial().extend({
  seed: z.enum(['database_upload']).optional(),
});
export const VaultOwnerSchema = z.object({ userId: z.string() });
// Optional `name` mirrors VaultTokenSchema; omitting it resolves to the
// `<hash13>-default` vault, never a bare `<hash13>`.
export const VaultRotateSchema = z.object({
  name: VaultName.optional(),
});
// `access` defaults to read-only so the CLI `inject` path, which sends no
// access at all, keeps minting read-only tokens.
export const VaultTokenSchema = z.object({
  name: VaultName.optional(),
  access: z
    .nativeEnum(VaultTokenAccess)
    .default(VaultTokenAccess.ReadOnly),
  expiration: Expiration.optional(),
});

// Also parses stored claims, whose resolved `<hash>-name` fits too.
export const VaultEnvSchema = z.object({
  vaultName: VaultName,
  environment: z.string(),
});

export const VaultInjectClaimsSchema = VaultEnvSchema.and(
  VaultInjectOptionsSchema,
);

export type VaultInjectClaims = z.infer<
  typeof VaultInjectClaimsSchema
>;
