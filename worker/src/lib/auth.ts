import z from 'zod';
import { VaultInjectClaimsSchema } from './vault';
import { AuthScopes } from '@shared/lib/constants';

export const ApiKeyClaimsFilterSchema =
  VaultInjectClaimsSchema.partial();

// Claims can't nest in a query string, so they arrive flattened, and a
// repeated `scopes` param comes through as an array of one or more.
export const ListApiKeysQuerySchema = VaultInjectClaimsSchema.extend({
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
