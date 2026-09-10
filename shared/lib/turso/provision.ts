import type {
  CreateDatabaseRequest,
  CreateDatabaseResponse,
  GetDatabaseResponse,
  ListDatabasesResponse,
  UpdateDatabaseRequest,
  UpdateDatabaseResponse,
} from '../../types/db';
import type { TursoClient } from './client';
import { VaultTokenAccess } from '../constants';
import { createLifecycleHandlers } from './lifecycle';
import { TURSO_DB_GROUP, TURSO_DB_SIZE_LIMIT } from './utils';

export const createProvisionHandlers = (client: TursoClient) => {
  const { deleteVault } = createLifecycleHandlers(client);

  const updateVault = async (
    vaultName: string,
    input: UpdateDatabaseRequest,
  ) => {
    const vaultConfig = await client.patch<UpdateDatabaseResponse>(
      `/${vaultName}/configuration`,
      input,
    );

    return vaultConfig;
  };

  const createVault = async (
    vaultName: string,
    seed?: 'database_upload',
  ) => {
    const body: CreateDatabaseRequest = {
      name: vaultName,
      group: TURSO_DB_GROUP,
      ...(seed
        ? { seed: { type: seed } }
        : { schema: 'parent-vault-schema' }),
    };

    const { database } = await client.post<CreateDatabaseResponse>(
      '',
      body,
    );

    try {
      await updateVault(database.Name, {
        size_limit: TURSO_DB_SIZE_LIMIT,
      });
    } catch (error) {
      await deleteVault(database.Name).catch(() => {});

      throw error;
    }

    return database;
  };

  // Omitting `expiration` leaves Turso's default of `never`, so existing
  // callers keep their current behavior.
  const createVaultToken = async (
    vaultName: string,
    access: VaultTokenAccess,
    expiration?: string,
  ) => {
    const path =
      `/${vaultName}/auth/tokens?authorization=${access}` +
      (expiration ? `&expiration=${expiration}` : '');

    const { jwt } = await client.post<{ jwt: string }>(path);

    return jwt;
  };

  const getVault = async (vaultName: string) => {
    const data = await client.get<GetDatabaseResponse>(
      `/${vaultName}`,
    );

    return data?.database ?? null;
  };

  // Lists every database owned by a user. All of a user's vaults share
  // the `<hash13>` prefix from vaultNameFromUserId(userId), so filtering
  // the org-wide list by that prefix scopes the result to one user
  // without touching anyone else's databases in the shared org.
  const listVaults = async (prefix: string) => {
    const data = await client.get<ListDatabasesResponse>('');

    return (data?.databases ?? []).filter((db) =>
      db.Name.startsWith(prefix),
    );
  };

  return { createVault, createVaultToken, getVault, listVaults };
};
