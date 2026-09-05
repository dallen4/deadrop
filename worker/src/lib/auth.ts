import z from 'zod';
import { VaultInjectClaimsSchema } from './vault';
import { AuthScopes } from '../constants';

export const ApiKeyClaimsFilterSchema =
  VaultInjectClaimsSchema.partial();

export const ListApiKeysOptionsSchema = z.object({
  scopes: z.array(z.nativeEnum(AuthScopes)).optional(),
  claims: z.any().optional(),
});
