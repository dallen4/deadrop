import { authenticated } from 'lib/middleware';
import { hono } from '../../lib/http/core';
import { AuthScopes, FEATURE_SLUGS } from '@shared/config/plans';
import { AppRouteParts } from '../../constants';
import { zValidator } from '@hono/zod-validator';
import {
  ApiKeyClaimsFilterSchema,
  ListApiKeysQuerySchema,
} from 'lib/auth';
import { vaultNameFromUserId } from '@shared/lib/turso';
import {
  VaultInjectClaims,
  VaultInjectClaimsSchema,
} from 'lib/vault';
import { KeyNotIssued } from 'lib/messages';

const apiKeysRouter = hono()
  .use(authenticated({ feature: FEATURE_SLUGS.API_KEYS }))
  .get(
    AppRouteParts.Root,
    zValidator('query', ListApiKeysQuerySchema),
    async (c) => {
      const userId = c.get('userId')!;
      const clerkClient = c.get('clerk');

      const { data: userApiKeys } = await clerkClient.apiKeys.list({
        subject: userId,
      });

      const {
        scopes: scopesFilter,
        vaultName,
        environment: environmentFilter,
      } = c.req.valid('query');

      // Claims carry the resolved cloud name so formatting is required
      const vaultNameFilter = await vaultNameFromUserId(userId, vaultName);

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
          scopes: key.scopes as [AuthScopes.VaultInject],
          claims: key.claims! as VaultInjectClaims,
          expired: key.expired,
          revoked: key.revoked,
        }));

      return c.json(keys, 200);
    },
  )
  .post(
    AppRouteParts.Root,
    zValidator('json', VaultInjectClaimsSchema),
    async (c) => {
      const userId = c.get('userId')!;
      const clerkClient = c.get('clerk');

      const cap = c.get('planLimits')?.apiKeys;

      if (cap !== undefined && cap !== Infinity) {
        // Counted from Clerk, the system of record, so a key revoked in
        // their dashboard frees a slot with no reconciliation here.
        const { data, totalCount } = await clerkClient.apiKeys.list({
          subject: userId,
        });

        if ((totalCount ?? data.length) >= cap)
          return c.json(
            {
              error:
                `Your plan allows ${cap} API key(s). ` +
                `Revoke one or upgrade to issue another.`,
            },
            403,
          );
      }

      const {
        vaultName: name,
        environment,
        ...injectOptions
      } = c.req.valid('json');

      const vaultName = await vaultNameFromUserId(userId, name);

      // Reissuing for the same vault/environment is normal, and the
      // Clerk modal is the only place keys are told apart and revoked.
      const issuedAt = new Date()
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/T(\d{4}).*$/, '-$1');

      const claims: VaultInjectClaims = {
        vaultName,
        environment,
        ...injectOptions,
      };

      const apiKey = await clerkClient.apiKeys.create({
        name: `${name} (${environment}) ${issuedAt}`,
        description: `Used to inject ${environment} secrets from ${name} into CI/CD processes.`,
        subject: userId,
        // scopes & claims can be parameterized in the future
        scopes: [AuthScopes.VaultInject],
        claims,
      });

      // Clerk returns the plaintext only on create and stores it hashed,
      // so a key we can't hand back is unusable
      if (!apiKey.secret) return c.json(KeyNotIssued, 500);

      return c.json(
        {
          id: apiKey.id,
          name: apiKey.name,
          key: apiKey.secret,
          claims,
        },
        201,
      );
    },
  );

export default apiKeysRouter;
