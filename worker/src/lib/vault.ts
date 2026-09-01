import { VaultTokenAccess } from '@shared/lib/constants';
import z from 'zod';

export const VaultNameSchema = z.object({ name: z.string() });
export const CreateVaultSchema = VaultNameSchema.partial().extend({
  seed: z.enum(['database_upload']).optional(),
});
export const VaultOwnerSchema = z.object({ userId: z.string() });
// Optional `name` mirrors VaultTokenSchema so the default vault (bare
// `<hash13>`, no suffix) stays addressable.
export const VaultRotateSchema = z.object({
  name: z.string().optional(),
});
// `access` defaults to read-only so the CLI `inject` path, which sends no
// access at all, keeps minting read-only tokens.
export const VaultTokenSchema = z.object({
  name: z.string().optional(),
  access: z
    .nativeEnum(VaultTokenAccess)
    .default(VaultTokenAccess.ReadOnly),
  expiration: z.string().optional(),
});

export const VaultInjectClaimsSchema = z.object({
  vaultName: z.string(),
  environment: z.string(),
});

export type VaultInjectClaims = z.infer<
  typeof VaultInjectClaimsSchema
>;
