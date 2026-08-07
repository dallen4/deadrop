import {
  BaseDirectory,
  exists,
  mkdir,
  readTextFile,
  writeTextFile,
} from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import { parse, stringify } from 'yaml';
import { vault as buildVaultConfig } from '@shared/lib/vault';
import type { DeadropConfig, VaultDBConfig } from '@shared/types/config';

// Same `.deadroprc` YAML pattern CLI (lib/config.ts) and vscode-extension
// (src/lib/config.ts) already use, not a JSON store — same DeadropConfig
// shape, just a different root directory (Tauri's app data dir; desktop has
// no "workspace root"/cwd the way CLI/vscode-extension do).
const CONFIG_FILE_NAME = '.deadroprc';

export async function loadVaultConfig(): Promise<DeadropConfig | null> {
  const fileExists = await exists(CONFIG_FILE_NAME, {
    baseDir: BaseDirectory.AppData,
  });
  if (!fileExists) return null;

  const contents = await readTextFile(CONFIG_FILE_NAME, {
    baseDir: BaseDirectory.AppData,
  });
  return parse(contents) as DeadropConfig;
}

export async function saveVaultConfig(
  config: DeadropConfig,
): Promise<void> {
  await mkdir('.', { baseDir: BaseDirectory.AppData, recursive: true });
  await writeTextFile(CONFIG_FILE_NAME, stringify(config), {
    baseDir: BaseDirectory.AppData,
  });
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
