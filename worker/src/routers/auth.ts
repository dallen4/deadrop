import { AppRouteParts } from '../constants';
import { hono } from '../lib/http/core';
import { authenticated, restricted } from '../lib/middleware';
import { KeyNotIssued } from '../lib/messages';
import { zValidator } from '@hono/zod-validator';
import { vaultNameFromUserId } from '@shared/lib/turso';
import { VaultInjectClaimsSchema } from '../lib/vault';
import {
  ApiKeyClaimsFilterSchema,
  ListApiKeysQuerySchema,
} from '../lib/auth';
import { AuthScopes } from '@shared/lib/constants';

const authRouter = hono()
  .get(
    AppRouteParts.CreateSignInToken,
    authenticated(),
    async (c) => {
      const userId = c.get('userId')!;

      const clerkClient = c.get('clerk');

      const { token } =
        await clerkClient.signInTokens.createSignInToken({
          userId,
          expiresInSeconds: 60,
        });

      return c.json({ token }, 200);
    },
  )
  .get(
    AppRouteParts.ApiKeys,
    authenticated(),
    restricted(),
    zValidator('query', ListApiKeysQuerySchema),
    async (c) => {
      const userId = c.get('userId')!;

      const clerkClient = c.get('clerk');

      const { data: userApiKeys } = await clerkClient.apiKeys.list({
        subject: userId,
      });

      const {
        scopes: scopesFilter,
        vaultName: vaultNameFilter,
        environment: environmentFilter,
      } = c.req.valid('query');

      const keys = userApiKeys
        .filter(({ scopes, claims }) => {
          if (scopes.length === 0) return false;

          if (
            scopesFilter &&
            !scopes.some((scope) =>
              scopesFilter.includes(scope as AuthScopes),
            )
          )
            return false;

          if (!ApiKeyClaimsFilterSchema.safeParse(claims).success)
            return false;

          return (
            claims?.vaultName === vaultNameFilter &&
            claims?.environment === environmentFilter
          );
        })
        .map((key) => ({
          id: key.id,
          name: key.name,
          expired: key.expired,
          revoked: key.revoked,
        }));

      return c.json(keys, 200);
    },
  )
  .post(
    AppRouteParts.ApiKeys,
    authenticated(),
    restricted(),
    zValidator('json', VaultInjectClaimsSchema),
    async (c) => {
      const userId = c.get('userId')!;

      const { vaultName: name, environment } = c.req.valid('json');

      const vaultName = await vaultNameFromUserId(userId, name);

      const clerkClient = c.get('clerk');

      // Reissuing for the same vault/environment is normal, and the
      // Clerk modal is the only place keys are told apart and revoked.
      const issuedAt = new Date()
        .toISOString()
        .replace(/\.\d{3}Z$/, 'Z');

      const apiKey = await clerkClient.apiKeys.create({
        name: `${vaultName} ${environment} Key ${issuedAt}`,
        description: `Used to inject ${environment} secrets from ${vaultName} into CI/CD processes.`,
        subject: userId,
        scopes: [AuthScopes.VaultInject],
        claims: {
          vaultName,
          environment,
        },
      });

      // Clerk returns the plaintext only on create and stores it hashed,
      // so a key we can't hand back is unusable
      if (!apiKey.secret) return c.json(KeyNotIssued, 500);

      return c.json(
        { id: apiKey.id, name: apiKey.name, key: apiKey.secret },
        201,
      );
    },
  );

export default authRouter;
