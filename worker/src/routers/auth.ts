import { AppRouteParts, AuthScopes } from '../constants';
import { hono } from '../lib/http/core';
import { authenticated, restricted } from '../lib/middleware';
import { KeyNotIssued } from '../lib/messages';
import { zValidator } from '@hono/zod-validator';
import { vaultNameFromUserId } from '@shared/lib/turso';
import { VaultInjectClaimsSchema } from '../lib/vault';

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
