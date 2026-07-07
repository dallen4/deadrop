import type {
  CreateDatabaseRequest,
  CreateDatabaseResponse,
  GetDatabaseResponse,
  ListDatabasesResponse,
} from '../../types/db';
import type { TursoClient } from './client';

export const createProvisionHandlers = (
  client: TursoClient,
) => {
  const createVault = async (
    vaultName: string,
    seed?: 'database_upload',
  ) => {
    const body: CreateDatabaseRequest = {
      name: vaultName,
      group: 'deadrop',
      ...(seed
        ? { seed: { type: seed } }
        : { schema: 'parent-vault-schema' }),
    };

    const { database } = await client.post<
      CreateDatabaseResponse
    >('', body);

    return database;
  };

  const createVaultToken = async (
    vaultName: string,
    access: 'full-access' | 'read-only',
  ) => {
    const path =
      `/${vaultName}/auth/tokens?authorization=${access}`;

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
