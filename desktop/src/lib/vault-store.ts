import { invoke } from '@tauri-apps/api/core';
import type { VaultDBConfig } from '@shared/types/config';

// Thin, dumb passthrough to the Rust vault_* commands
// (desktop/src-tauri/src/vault_store.rs). Every value here is either
// already-encrypted (secret values) or non-sensitive (names/environments) —
// encryption/decryption happens in the webview via shared/lib/secrets.ts,
// never in Rust. Rust only stores/returns opaque strings.

type VaultDbConfigDto = {
  location: string;
  cloud?: { syncUrl: string; authToken?: string };
};

const toDto = (vault: VaultDBConfig): VaultDbConfigDto => ({
  location: vault.location,
  cloud: vault.cloud
    ? { syncUrl: vault.cloud.syncUrl, authToken: vault.cloud.authToken }
    : undefined,
});

export async function ensureVaultSchema(
  vault: VaultDBConfig,
): Promise<void> {
  await invoke('vault_ensure_schema', { config: toDto(vault) });
}

export async function listSecretNames(
  vault: VaultDBConfig,
): Promise<Array<{ name: string; environment: string }>> {
  return invoke('vault_list_secret_names', { config: toDto(vault) });
}

export async function getEncryptedSecret(
  vault: VaultDBConfig,
  name: string,
  environment: string,
): Promise<string | null> {
  return invoke('vault_get_encrypted_secret', {
    config: toDto(vault),
    name,
    environment,
  });
}

export async function addEncryptedSecret(
  vault: VaultDBConfig,
  name: string,
  environment: string,
  encryptedValue: string,
): Promise<void> {
  await invoke('vault_add_secret', {
    config: toDto(vault),
    name,
    environment,
    encryptedValue,
  });
}

export async function updateEncryptedSecret(
  vault: VaultDBConfig,
  name: string,
  environment: string,
  encryptedValue: string,
): Promise<void> {
  await invoke('vault_update_secret', {
    config: toDto(vault),
    name,
    environment,
    encryptedValue,
  });
}

export async function renameSecret(
  vault: VaultDBConfig,
  oldName: string,
  newName: string,
  environment: string,
): Promise<void> {
  await invoke('vault_rename_secret', {
    config: toDto(vault),
    oldName,
    newName,
    environment,
  });
}

export async function deleteSecret(
  vault: VaultDBConfig,
  name: string,
  environment?: string,
): Promise<void> {
  await invoke('vault_delete_secret', {
    config: toDto(vault),
    name,
    environment,
  });
}
