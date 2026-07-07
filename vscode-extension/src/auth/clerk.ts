import * as vscode from 'vscode';
import { readFile, writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { parse, stringify } from 'yaml';
import { STORAGE_DIR_NAME } from '@shared/lib/constants';
import type { Clerk as ClerkType } from '@clerk/clerk-js';
import { Clerk } from '@clerk/clerk-js';

type AuthCache = {
  token: string;
  lastAuthenticated: number;
};

// ── Creds file (shared with CLI) ──────────────────────────

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
  await unlink(credsPath);
}

// ── Clerk client (mirrors CLI pattern) ────────────────────

global.window = global.window || ({} as typeof window);

let clerkInstance: ClerkType | null = null;

export async function getClerkClient(): Promise<ClerkType> {
  if (clerkInstance) return clerkInstance;

  clerkInstance = new Clerk(process.env.CLERK_PUBLISHABLE_KEY!);

  const fapiClient = clerkInstance.getFapiClient();

  fapiClient.onBeforeRequest(async (requestInit) => {
    requestInit.credentials = 'omit';
    requestInit.url?.searchParams.append('_is_native', '1');
    const token = await readCredsFile();
    (requestInit.headers as Headers).set(
      'authorization',
      token ?? '',
    );
  });

  fapiClient.onAfterResponse(async (_, response) => {
    const authHeader = response?.headers.get('authorization');
    if (authHeader) await writeCredsFile(authHeader);
  });

  await clerkInstance.load({ standardBrowser: false });

  return clerkInstance;
}

// ── Public API (used by SidebarProvider, VaultPanel, etc.) ──

export async function getToken(
  _secrets: vscode.SecretStorage,
): Promise<string | null> {
  return readCredsFile();
}

export async function getSessionToken(): Promise<string | null> {
  try {
    const clerk = await getClerkClient();
    if (clerk.session) {
      const jwt = await clerk.session.getToken();
      if (jwt) return jwt;
    }
    return readCredsFile();
  } catch {
    return readCredsFile();
  }
}

export async function storeToken(
  _secrets: vscode.SecretStorage,
  token: string,
): Promise<void> {
  await writeCredsFile(token);
}

export async function hasCloudAccess(): Promise<boolean> {
  try {
    const clerk = await getClerkClient();
    if (!clerk.session) return false;
    const jwt = await clerk.session.getToken();
    if (!jwt) return false;
    const payload = JSON.parse(
      Buffer.from(jwt.split('.')[1], 'base64').toString(),
    );
    console.log("PAYLOAD", payload);
    return !!(payload.early_access || payload.internal);
  } catch {
    return false;
  }
}

export async function deleteToken(
  _secrets: vscode.SecretStorage,
): Promise<void> {
  if (clerkInstance?.session) {
    try { await clerkInstance.signOut(); } catch {}
  }
  clerkInstance = null;
  await deleteCredsFile();
}
