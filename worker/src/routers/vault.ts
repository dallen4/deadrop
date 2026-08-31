import { zValidator } from '@hono/zod-validator';
import { AppRouteParts, AuthScopes } from '../constants';
import { hono } from '../lib/http/core';
import {
  createVaultUtils,
  vaultNameFromUserId,
  TursoApiError,
} from '@shared/lib/turso';
import { VaultTokenAccess } from '@shared/lib/constants';
import {
  MintedVaultCreds,
  VaultApiKeyCreds,
} from '@shared/lib/vault-tokens';
import {
  apiKey,
  authenticated,
  restricted,
  service,
} from '../lib/middleware';
import {
  CreateVaultSchema,
  VaultInjectClaims,
  VaultNameSchema,
  VaultOwnerSchema,
  VaultRotateSchema,
  VaultTokenSchema,
} from 'lib/vault';

const vaultRouter = hono()
  .post(
    AppRouteParts.Root,
    authenticated({ allowApiKey: true }),
    restricted(),
    zValidator('json', CreateVaultSchema),
    async (c) => {
      const userId = c.get('userId')!;

      const { createVault, createVaultToken } = createVaultUtils(
        c.env.TURSO_PLATFORM_API_TOKEN,
      );

      try {
        const { name, seed } = c.req.valid('json');

        const vaultName = await vaultNameFromUserId(userId, name);

        const vaultDatabase = await createVault(vaultName, seed);

        const vaultToken = await createVaultToken(
          vaultName,
          VaultTokenAccess.FullAccess,
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

      const { createVaultToken } = createVaultUtils(
        c.env.TURSO_PLATFORM_API_TOKEN,
      );

      const { name, access, expiration } = c.req.valid('json');

      try {
        const vaultName = await vaultNameFromUserId(userId, name);

        const token = await createVaultToken(
          vaultName,
          access,
          expiration,
        );

        // Typed so a rename breaks the build, not the CLI's sync.
        const creds: MintedVaultCreds = { name: vaultName, token };

        return c.json(creds, 201);
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
  .post(
    AppRouteParts.CiTokens,
    apiKey({ scopes: [AuthScopes.VaultInject] }),
    restricted(),
    async (c) => {
      const { vaultName, environment } = c.get(
        'claims',
      )! as VaultInjectClaims;

      try {
        const { createVaultToken } = createVaultUtils(
          c.env.TURSO_PLATFORM_API_TOKEN,
        );

        const token = await createVaultToken(
          vaultName,
          VaultTokenAccess.ReadOnly,
          '5m',
        );

        const creds: VaultApiKeyCreds = {
          name: vaultName,
          token,
          environment,
        };

        return c.json(creds, 201);
      } catch (error) {
        if (error instanceof TursoApiError && error.status === 404) {
          return c.json(
            {
              error: vaultName
                ? `Vault '${vaultName}' not found.`
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
    zValidator('json', VaultRotateSchema),
    async (c) => {
      const userId = c.get('userId')!;

      const { name } = c.req.valid('json');

      const vaultName = await vaultNameFromUserId(userId!, name);

      const { invalidateTokens } = createVaultUtils(
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
