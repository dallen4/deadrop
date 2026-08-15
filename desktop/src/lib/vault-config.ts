import { mkdir, BaseDirectory } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import { open as openFileDialog } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { parse, stringify } from 'yaml';
import { vault as buildVaultConfig } from '@shared/lib/vault';
import type { DeadropConfig, VaultDBConfig } from '@shared/types/config';

// Same `.deadroprc` YAML pattern CLI (lib/config.ts) and vscode-extension
// (src/lib/config.ts) already use, not a JSON store — same DeadropConfig
// shape, just a different root directory (Tauri's app data dir; desktop has
// no "workspace root"/cwd the way CLI/vscode-extension do).
//
// Read/write goes through Rust commands (read_app_vault_config /
// write_app_vault_config), not `@tauri-apps/plugin-fs` — the fs plugin's
// `$APPDATA/**` capability scope didn't reliably match a file directly at
// $APPDATA's root, so writes were silently no-op'ing. Custom commands
// bypass that scope entirely, same pattern as read_external_text_file and
// vault_store.rs's DB access.
export async function loadVaultConfig(): Promise<DeadropConfig | null> {
  const contents = await invoke<string | null>('read_app_vault_config');
  if (!contents) return null;
  return parse(contents) as DeadropConfig;
}

export async function saveVaultConfig(
  config: DeadropConfig,
): Promise<void> {
  await invoke('write_app_vault_config', { contents: stringify(config) });
}

async function ensureVaultsDir(): Promise<void> {
  await mkdir('vaults', {
    baseDir: BaseDirectory.AppData,
    recursive: true,
  });
}

export async function vaultPathForName(name: string): Promise<string> {
  await ensureVaultsDir();
  const dir = await appDataDir();
  return join(dir, 'vaults', `${name}.db`);
}

export async function createNamedVault(
  name: string,
): Promise<VaultDBConfig> {
  return buildVaultConfig(await vaultPathForName(name));
}

// A cloud vault's `location` is a replica path from another machine.
export async function resolveImportedVault(
  name: string,
  vaultConfig: VaultDBConfig,
): Promise<VaultDBConfig> {
  if (!vaultConfig.cloud) return vaultConfig;

  return { ...vaultConfig, location: await vaultPathForName(name) };
}

// Links a project-scoped `.deadroprc` (CLI/vscode-extension) into the
// desktop config. Entries go through resolveImportedVault at the call site.
export async function pickExternalVaultConfig(): Promise<DeadropConfig | null> {
  const path = await openFileDialog({
    multiple: false,
    filters: [{ name: 'deadrop config', extensions: ['deadroprc', 'yaml', 'yml'] }],
  });
  if (!path) return null;

  const contents = await invoke<string>('read_external_text_file', { path });
  const parsed = parse(contents) as DeadropConfig;
  if (!parsed?.vaults || !parsed?.active_vault) {
    throw new Error(`Not a valid .deadroprc: ${path}`);
  }
  return parsed;
}
