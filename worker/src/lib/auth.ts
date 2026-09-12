import z from 'zod';
import { VaultEnvSchema } from './vault';
import { AuthScopes } from '@shared/config/plans';

export const ApiKeyClaimsFilterSchema = VaultEnvSchema.partial();

// Claims can't nest in a query string, so they arrive flattened, and a
// repeated `scopes` param comes through as an array of one or more.
export const ListApiKeysQuerySchema = VaultEnvSchema.extend({
  scopes: z
    .union([
      z.nativeEnum(AuthScopes),
      z.array(z.nativeEnum(AuthScopes)),
    ])
    .transform((scopes) =>
      Array.isArray(scopes) ? scopes : [scopes],
    )
    .optional(),
});
