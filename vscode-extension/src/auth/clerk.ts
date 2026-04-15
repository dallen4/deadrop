import * as vscode from 'vscode';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { parse, stringify } from 'yaml';
import { STORAGE_DIR_NAME } from '@shared/lib/constants';

const SECRET_KEY = 'deadrop-clerk-token';

type AuthCache = {
  token: string;
  lastAuthenticated: number;
};

function getCredsPath(): string | null {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!root) return null;
  return path.join(root, STORAGE_DIR_NAME, 'creds');
}

async function readCredsFile(): Promise<string | null> {
  const credsPath = getCredsPath();
  if (!credsPath || !existsSync(credsPath)) return null;
  try {
    const raw = await readFile(credsPath, 'utf-8');
    const cache = parse(raw) as AuthCache;
    return cache?.token ?? null;
  } catch {
    return null;
  }
}

async function writeCredsFile(token: string): Promise<void> {
  const credsPath = getCredsPath();
  if (!credsPath) return;
  const dir = path.dirname(credsPath);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  const cache: AuthCache = { token, lastAuthenticated: Date.now() };
  await writeFile(credsPath, stringify(cache), 'utf-8');
}

async function deleteCredsFile(): Promise<void> {
  const credsPath = getCredsPath();
  if (!credsPath || !existsSync(credsPath)) return;
  const { unlink } = await import('fs/promises');
  await unlink(credsPath);
}

export async function getToken(
  secrets: vscode.SecretStorage,
): Promise<string | null> {
  const fileToken = await readCredsFile();
  if (fileToken) return fileToken;
  return (await secrets.get(SECRET_KEY)) ?? null;
}

export async function storeToken(
  secrets: vscode.SecretStorage,
  token: string,
): Promise<void> {
  await writeCredsFile(token);
  await secrets.store(SECRET_KEY, token);
}

export async function deleteToken(
  secrets: vscode.SecretStorage,
): Promise<void> {
  await deleteCredsFile();
  await secrets.delete(SECRET_KEY);
}
