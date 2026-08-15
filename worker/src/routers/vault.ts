import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { AppRouteParts } from '../constants';
import { hono } from '../lib/http/core';
import {
  createVaultUtils,
  vaultNameFromUserId,
  TursoApiError,
} from '@shared/lib/turso';
import { TURSO_ORGANIZATION } from '@shared/lib/constants';
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
// `access` defaults to read-only so the CLI `inject` path, which sends no
// access at all, keeps minting read-only tokens.
const VaultTokenSchema = z.object({
  name: z.string().optional(),
  access: z
    .enum(['full-access', 'read-only'])
    .default('read-only'),
  expiration: z.string().optional(),
});

const vaultRouter = hono()
  .post(
    AppRouteParts.Root,
    authenticated({ allowApiKey: true }),
    restricted(),
    zValidator('json', CreateVaultSchema),
    async (c) => {
      const userId = c.get('userId')!;

      const { createVault, createVaultToken } = createVaultUtils(
        TURSO_ORGANIZATION,
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
    AppRouteParts.Tokens,
    authenticated({ allowApiKey: true }),
    restricted(),
    zValidator('json', VaultTokenSchema),
    async (c) => {
      const userId = c.get('userId')!;

      const { createVaultToken, getVault } = createVaultUtils(
        TURSO_ORGANIZATION,
        c.env.TURSO_PLATFORM_API_TOKEN,
      );

      const { name, access, expiration } = c.req.valid('json');

      try {
        const vaultName = await vaultNameFromUserId(userId!, name);

        const [vault, token] = await Promise.all([
          getVault(vaultName),
          createVaultToken(vaultName, access, expiration),
        ]);

        // `name` is the resolved remote database name — callers derive
        // the sync URL from it rather than storing one.
        return c.json(
          { token, name: vaultName, hostname: vault?.Hostname },
          201,
        );
      } catch (error) {
        if (error instanceof TursoApiError && error.status === 404) {
          return c.json(
            {
              error: name
                ? `Vault '${name}' not found.`
                : 'No default vault found for this account.',
            },
            404,
          );
        }
        return c.json(
          { error: `Unexpected error: ${(error as Error).message}` },
          500,
        );
      }
    },
  )
  .get(
    AppRouteParts.NameParam,
    authenticated({ allowApiKey: true }),
    zValidator('param', VaultNameSchema),
    async (c) => {
      const userId = c.get('userId')!;

      const { name } = c.req.valid('param');

      const vaultName = await vaultNameFromUserId(userId!, name);

      const { getVault } = createVaultUtils(
        TURSO_ORGANIZATION,
        c.env.TURSO_PLATFORM_API_TOKEN,
      );

      const vault = await getVault(vaultName);

      return c.json({ vault }, 200);
    },
  )
  .delete(
    AppRouteParts.NameParam,
    authenticated(),
    restricted(),
    zValidator('param', VaultNameSchema),
    async (c) => {
      const userId = c.get('userId')!;

      const { name } = c.req.valid('param');

      const vaultName = await vaultNameFromUserId(userId!, name);

      const { deleteVault } = createVaultUtils(
        TURSO_ORGANIZATION,
        c.env.TURSO_PLATFORM_API_TOKEN,
      );

      const deleted = await deleteVault(vaultName);

      return c.json({ success: deleted }, 200);
    },
  )
  // Break-glass credential reset. Turso has no single-token revoke, so
  // this invalidates *every* token for the database — the owner's other
  // surfaces and every share recipient included. Deliberately not
  // `allowApiKey`: destructive, so it needs an interactive session.
  .post(
    AppRouteParts.Rotate,
    authenticated(),
    restricted(),
    zValidator('param', VaultNameSchema),
    async (c) => {
      const userId = c.get('userId')!;

      const { name } = c.req.valid('param');

      const vaultName = await vaultNameFromUserId(userId!, name);

      const { invalidateTokens } = createVaultUtils(
        TURSO_ORGANIZATION,
        c.env.TURSO_PLATFORM_API_TOKEN,
      );

      try {
        await invalidateTokens(vaultName);

        return c.json({ rotated: true, name: vaultName }, 200);
      } catch (error) {
        if (error instanceof TursoApiError && error.status === 404) {
          return c.json({ error: `Vault '${name}' not found.` }, 404);
        }
        return c.json(
          { error: `Unexpected error: ${(error as Error).message}` },
          500,
        );
      }
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
        TURSO_ORGANIZATION,
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
        TURSO_ORGANIZATION,
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
