import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { AppRouteParts } from '../constants';
import { hono } from 'lib/http/core';
import { createVaultUtils, vaultNameFromUserId } from 'lib/vault';
import { authenticated, restricted } from 'lib/middleware';

const VaultNameSchema = z.object({ name: z.string() });

const vaultRouter = hono()
  .post(
    AppRouteParts.Root,
    restricted(),
    zValidator('json', VaultNameSchema.partial()),
    async (c) => {
      const userId = c.get('clerkAuth')!.userId!;

      const { createVault, createVaultToken } = createVaultUtils(
        c.env.TURSO_ORGANIZATION,
        c.env.TURSO_PLATFORM_API_TOKEN,
      );

      try {
        const { name } = c.req.valid('json');

        const vaultName = await vaultNameFromUserId(userId!, name);

        const vaultDatabase = await createVault(vaultName);

        const vaultToken = await createVaultToken(
          vaultName,
          'full-access',
        );

        return c.json(
          {
            id: vaultDatabase.DbId,
            name: vaultName,
            token: vaultToken,
          },
          201,
        );
      } catch (error) {
        return c.json(
          { error: `Unexpected error: ${(error as Error).message}` },
          500,
        );
      }
    },
  )
  .post(
    AppRouteParts.Share,
    restricted(),
    zValidator('json', VaultNameSchema),
    async (c) => {
      const userId = c.get('clerkAuth')!.userId!;

      const { createVaultToken } = createVaultUtils(
        c.env.TURSO_ORGANIZATION,
        c.env.TURSO_PLATFORM_API_TOKEN,
      );

      const { name } = c.req.valid('json');

      try {
        const vaultName = await vaultNameFromUserId(userId!, name);

        const token = await createVaultToken(vaultName, 'read-only');

        return c.json({ token }, 201);
      } catch (error) {
        return c.json(
          { error: `Unexpected error: ${(error as Error).message}` },
          500,
        );
      }
    },
  )
  .get(
    AppRouteParts.NameParam,
    authenticated(),
    zValidator('param', z.object({ name: z.string() })),
    async (c) => {
      const userId = c.get('clerkAuth')!.userId!;

      const { name } = c.req.valid('param');

      const vaultName = await vaultNameFromUserId(userId!, name);

      const { getVault } = createVaultUtils(
        c.env.TURSO_ORGANIZATION,
        c.env.TURSO_PLATFORM_API_TOKEN,
      );

      const vault = await getVault(vaultName);

      return c.json({ vault }, 200);
    },
  )
  .delete(
    AppRouteParts.NameParam,
    restricted(),
    zValidator('param', z.object({ name: z.string() })),
    async (c) => {
      const userId = c.get('clerkAuth')!.userId!;

      const { name } = c.req.valid('param');

      const vaultName = await vaultNameFromUserId(userId!, name);

      const { deleteVault } = createVaultUtils(
        c.env.TURSO_ORGANIZATION,
        c.env.TURSO_PLATFORM_API_TOKEN,
      );

      const deleted = await deleteVault(vaultName);

      return c.json({ success: deleted }, 200);
    },
  );

export default vaultRouter;
