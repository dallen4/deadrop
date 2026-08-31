import z from 'zod';
import { AppRouteParts, AuthScopes } from '../constants';
import { hono } from '../lib/http/core';
import { authenticated, restricted } from '../lib/middleware';
import { zValidator } from '@hono/zod-validator';
import { vaultNameFromUserId } from '@shared/lib/turso';
import { VaultInjectClaimsSchema } from 'lib/vault';

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
  .post(
    AppRouteParts.CreateApiKey,
    authenticated(),
    restricted(),
    zValidator('json', VaultInjectClaimsSchema),
    async (c) => {
      const userId = c.get('userId')!;

      const { vaultName: name, environment } = c.req.valid('json');

      const vaultName = await vaultNameFromUserId(userId, name);

      const clerkClient = c.get('clerk');

      const apiKey = await clerkClient.apiKeys.create({
        name: `${vaultName} ${environment} Key`,
        description: `Used to inject ${environment} secrets from ${vaultName} into CI/CD processes.`,
        subject: userId,
        scopes: [AuthScopes.VaultInject],
        claims: {
          vaultName,
          environment,
        },
      });

      return c.json({ apiKey }, 200);
    },
  );

export default authRouter;
