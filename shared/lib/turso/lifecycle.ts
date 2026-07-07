import type { TursoClient } from './client';

type DatabaseConfiguration = {
  block_reads?: boolean;
  block_writes?: boolean;
  size_limit?: string;
  delete_protection?: boolean;
};

type ConfigurationResponse = {
  block_reads: boolean;
  block_writes: boolean;
  size_limit: string;
  delete_protection: boolean;
};

export const createLifecycleHandlers = (client: TursoClient) => {
  const updateConfiguration = async (
    vaultName: string,
    config: DatabaseConfiguration,
  ) =>
    client.patch<ConfigurationResponse>(
      `/${vaultName}/configuration`,
      config,
    );

  const invalidateTokens = async (vaultName: string) =>
    client.post<void>(`/${vaultName}/auth/rotate`);

  const suspendVault = async (vaultName: string) => {
    await updateConfiguration(vaultName, {
      block_reads: true,
      block_writes: true,
    });

    await invalidateTokens(vaultName);
  };

  const restoreVault = async (vaultName: string) =>
    updateConfiguration(vaultName, {
      block_reads: false,
      block_writes: false,
    });

  const deleteVault = async (vaultName: string) => {
    const resp = await client.del<{ database: string }>(
      `/${vaultName}`,
    );

    return !!resp?.database;
  };

  return {
    updateConfiguration,
    invalidateTokens,
    suspendVault,
    restoreVault,
    deleteVault,
  };
};
