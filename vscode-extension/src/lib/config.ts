import { cosmiconfig } from 'cosmiconfig';
import { stringify } from 'yaml';
import { writeFile } from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import type { DeadropConfig } from '@shared/types/config';

export type { DeadropConfig };

const explorer = cosmiconfig('deadrop');

function getWorkspaceRoot(): string | null {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}

export async function loadConfig(): Promise<DeadropConfig | null> {
  const root = getWorkspaceRoot();
  if (!root) return null;
  explorer.clearCaches();
  const result = await explorer.search(root);
  return result?.config ?? null;
}

export async function saveConfig(config: DeadropConfig): Promise<void> {
  const root = getWorkspaceRoot();
  if (!root) throw new Error('No workspace folder open.');
  const configPath = path.join(root, '.deadroprc');
  await writeFile(configPath, stringify(config), 'utf-8');
  explorer.clearCaches();
}
