import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/react';
import { showNotification } from '@mantine/notifications';
import { initEnvKey } from '@shared/lib/vault';
import { unwrapSecret, wrapSecret } from '@shared/lib/secrets';
import type { DeadropConfig } from '@shared/types/config';
import { isExperimental } from '../lib/billing';
import { useApiHeaders } from '../lib/api-headers';
import {
  createNamedVault,
  loadVaultConfig,
  pickExternalVaultConfig,
  saveVaultConfig,
} from '../lib/vault-config';
import { deleteCloudVault, provisionCloudVault } from '../lib/vault-cloud';
import {
  addEncryptedSecret,
  deleteSecret as deleteSecretRow,
  ensureVaultSchema,
  getEncryptedSecret,
  listSecretNames,
  renameSecret as renameSecretRow,
  updateEncryptedSecret,
} from '../lib/vault-store';

type SecretName = { name: string; environment: string };

export const useVault = () => {
  const { sessionClaims } = useAuth();
  const getApiHeaders = useApiHeaders();
  const canCloudSync = isExperimental(sessionClaims);

  const [config, setConfig] = useState<DeadropConfig | null>(null);
  const [secretNames, setSecretNames] = useState<SecretName[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeVaultName = config?.active_vault.name ?? '';
  const activeVault = config?.vaults[activeVaultName];
  const activeEnv = config?.active_vault.environment ?? '';
  const environments = Object.keys(activeVault?.environments ?? {});
  const cloudSync = !!activeVault?.cloud;

  const refreshSecretNames = useCallback(async () => {
    if (!activeVault) return;
    await ensureVaultSchema(activeVault);
    setSecretNames(await listSecretNames(activeVault));
  }, [activeVault]);

  useEffect(() => {
    (async () => {
      try {
        setConfig(await loadVaultConfig());
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!activeVault) return;
    refreshSecretNames().catch((err) => setError((err as Error).message));
  }, [activeVault, refreshSecretNames]);

  const withBusy = useCallback(
    async (fn: () => Promise<void>) => {
      setBusy(true);
      setError(null);
      try {
        await fn();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const switchVault = (name: string) => {
    if (!config) return;
    const next: DeadropConfig = {
      ...config,
      active_vault: { name, environment: 'development' },
    };
    setConfig(next);
    void saveVaultConfig(next);
  };

  const switchEnv = (environment: string) => {
    if (!config) return;
    const next: DeadropConfig = {
      ...config,
      active_vault: { ...config.active_vault, environment },
    };
    setConfig(next);
    void saveVaultConfig(next);
  };

  const createVault = (name: string, cloud: boolean) =>
    withBusy(async () => {
      const vaultConfig = await createNamedVault(name);

      if (cloud) {
        vaultConfig.cloud = await provisionCloudVault(
          name,
          await getApiHeaders(),
        );
      }

      const next: DeadropConfig = {
        active_vault: { name, environment: 'development' },
        vaults: { ...config?.vaults, [name]: vaultConfig },
      };
      setConfig(next);
      await saveVaultConfig(next);
    });

  // Links vaults from a project-scoped `.deadroprc` (CLI `deadrop init` /
  // `vault create`, or vscode-extension) into this config, keyed by name.
  // The DB `location` stays wherever the project put it — desktop just
  // starts tracking it alongside vaults created in-app.
  const importVault = () =>
    withBusy(async () => {
      const imported = await pickExternalVaultConfig();
      if (!imported) return;

      const existingNames = new Set(Object.keys(config?.vaults ?? {}));
      const nextVaults = { ...config?.vaults };
      const importedNames: string[] = [];

      for (const [name, vaultConfig] of Object.entries(imported.vaults)) {
        let finalName = name;
        let suffix = 2;
        while (existingNames.has(finalName)) {
          finalName = `${name}-${suffix++}`;
        }
        existingNames.add(finalName);
        nextVaults[finalName] = vaultConfig;
        importedNames.push(finalName);
      }

      const next: DeadropConfig = {
        active_vault: config?.active_vault ?? {
          name: importedNames[0],
          environment: 'development',
        },
        vaults: nextVaults,
      };
      setConfig(next);
      await saveVaultConfig(next);

      showNotification({
        message: `Imported vault${importedNames.length > 1 ? 's' : ''}: ${importedNames.join(', ')}`,
        color: 'teal',
      });
    });

  const createEnvironment = (name: string) =>
    withBusy(async () => {
      if (!config || !activeVault) return;
      const key = await initEnvKey();
      const next: DeadropConfig = {
        ...config,
        active_vault: { ...config.active_vault, environment: name },
        vaults: {
          ...config.vaults,
          [activeVaultName]: {
            ...activeVault,
            environments: { ...activeVault.environments, [name]: key },
          },
        },
      };
      setConfig(next);
      await saveVaultConfig(next);
    });

  const toggleCloudSync = () =>
    withBusy(async () => {
      if (!config || !activeVault) return;
      const nextVault = { ...activeVault };

      if (cloudSync) {
        await deleteCloudVault(activeVaultName, await getApiHeaders());
        delete nextVault.cloud;
      } else {
        nextVault.cloud = await provisionCloudVault(
          activeVaultName,
          await getApiHeaders(),
        );
      }

      const next: DeadropConfig = {
        ...config,
        vaults: { ...config.vaults, [activeVaultName]: nextVault },
      };
      setConfig(next);
      await saveVaultConfig(next);
      await ensureVaultSchema(nextVault);
    });

  const addSecret = (name: string, value: string) =>
    withBusy(async () => {
      if (!activeVault) return;
      const encrypted = await wrapSecret(
        activeVault.environments[activeEnv],
        value,
      );
      await addEncryptedSecret(activeVault, name, activeEnv, encrypted);
      await refreshSecretNames();
    });

  const updateSecret = (
    name: string,
    environment: string,
    value: string,
  ) =>
    withBusy(async () => {
      if (!activeVault) return;
      const encrypted = await wrapSecret(
        activeVault.environments[environment],
        value,
      );
      await updateEncryptedSecret(
        activeVault,
        name,
        environment,
        encrypted,
      );
    });

  const renameSecret = (
    oldName: string,
    newName: string,
    environment: string,
  ) =>
    withBusy(async () => {
      if (!activeVault) return;
      await renameSecretRow(activeVault, oldName, newName, environment);
      await refreshSecretNames();
    });

  const deleteSecret = (name: string, environment: string) =>
    withBusy(async () => {
      if (!activeVault) return;
      await deleteSecretRow(activeVault, name, environment);
      await refreshSecretNames();
    });

  const revealSecret = async (
    name: string,
    environment: string,
  ): Promise<string> => {
    if (!activeVault) throw new Error('No active vault.');
    const encrypted = await getEncryptedSecret(
      activeVault,
      name,
      environment,
    );
    if (!encrypted) throw new Error('Secret not found.');
    return unwrapSecret(activeVault.environments[environment], encrypted);
  };

  return {
    config,
    loading,
    busy,
    error,
    canCloudSync,
    cloudSync,
    activeVaultName,
    activeEnv,
    environments,
    secretNames,
    switchVault,
    switchEnv,
    createVault,
    importVault,
    createEnvironment,
    toggleCloudSync,
    addSecret,
    updateSecret,
    renameSecret,
    deleteSecret,
    revealSecret,
  };
};
