import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { AppRouteParts } from '../constants';
import { hono } from '../lib/http/core';
import {
  createVaultUtils,
  vaultNameFromUserId,
} from '@shared/lib/turso';
import {
  authenticated,
  restricted,
  service,
} from '../lib/middleware';

const VaultNameSchema = z.object({ name: z.string() });
const CreateVaultSchema = VaultNameSchema.partial().extend({
  seed: z.enum(['database_upload']).optional(),
});
const VaultOwnerSchema = z.object({ userId: z.string() });

const vaultRouter = hono()
  .post(
    AppRouteParts.Root,
    restricted(),
    zValidator('json', CreateVaultSchema),
    async (c) => {
      const userId = c.get('userId')!;

      const { createVault, createVaultToken } = createVaultUtils(
        c.env.TURSO_ORGANIZATION,
        c.env.TURSO_PLATFORM_API_TOKEN,
      );

      try {
        const { name, seed } = c.req.valid('json');

        const vaultName = await vaultNameFromUserId(userId!, name);

        const vaultDatabase = await createVault(vaultName, seed);

        const vaultToken = await createVaultToken(
          vaultName,
          'full-access',
        );

        return c.json(
          {
            id: vaultDatabase.DbId,
            name: vaultName,
            hostname: vaultDatabase.Hostname,
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
    restricted({ allowApiKey: true }),
    zValidator('json', VaultNameSchema),
    async (c) => {
      const userId = c.get('userId')!;

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
    zValidator('param', VaultNameSchema),
    async (c) => {
      const userId = c.get('userId')!;

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
    zValidator('param', VaultNameSchema),
    async (c) => {
      const userId = c.get('userId')!;

      const { name } = c.req.valid('param');

      const vaultName = await vaultNameFromUserId(userId!, name);

      const { deleteVault } = createVaultUtils(
        c.env.TURSO_ORGANIZATION,
        c.env.TURSO_PLATFORM_API_TOKEN,
      );

      const deleted = await deleteVault(vaultName);

      return c.json({ success: deleted }, 200);
    },
  )
  // Service-to-service: lock every cloud vault owned by `userId` (billing
  // cancellation). Auth is the service token, not a Clerk session — the
  // subject is supplied in the body.
  .post(
    AppRouteParts.Lock,
    service(),
    zValidator('json', VaultOwnerSchema),
    async (c) => {
      const { userId } = c.req.valid('json');

      const { listVaults, suspendVault } = createVaultUtils(
        c.env.TURSO_ORGANIZATION,
        c.env.TURSO_PLATFORM_API_TOKEN,
      );

      try {
        const prefix = await vaultNameFromUserId(userId);
        const vaults = await listVaults(prefix);

        await Promise.all(
          vaults.map((vault) => suspendVault(vault.Name)),
        );

        return c.json({ locked: vaults.length }, 200);
      } catch (error) {
        return c.json(
          { error: `Unexpected error: ${(error as Error).message}` },
          500,
        );
      }
    },
  )
  // Service-to-service: restore every cloud vault owned by `userId`
  // (subscription reactivated).
  .post(
    AppRouteParts.Unlock,
    service(),
    zValidator('json', VaultOwnerSchema),
    async (c) => {
      const { userId } = c.req.valid('json');

      const { listVaults, restoreVault } = createVaultUtils(
        c.env.TURSO_ORGANIZATION,
        c.env.TURSO_PLATFORM_API_TOKEN,
      );

      try {
        const prefix = await vaultNameFromUserId(userId);
        const vaults = await listVaults(prefix);

        await Promise.all(
          vaults.map((vault) => restoreVault(vault.Name)),
        );

        return c.json({ unlocked: vaults.length }, 200);
      } catch (error) {
        return c.json(
          { error: `Unexpected error: ${(error as Error).message}` },
          500,
        );
      }
    },
  );

export default vaultRouter;
