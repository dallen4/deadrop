import { TURSO_ORGANIZATION } from '../constants';
import { getSubtle } from '../crypto';

enum UrlProtocol {
  File = 'file:',
  Https = 'https://',
  Libsql = 'libsql://',
}

export const fileUrl = (path: string) =>
  `${UrlProtocol.File}${path}`;

export const syncUrl = (hostname: string) =>
  `${UrlProtocol.Libsql}${hostname}`;

// Turso hostnames have no random component, so the sync URL is a pure
// function of the remote database name and the org slug — nothing to store.
export const vaultSyncUrl = (
  name: string,
  org: string = TURSO_ORGANIZATION,
) => syncUrl(`${name}-${org}.turso.io`);

export const syncUrlToHttps = (url: string) =>
  url.replace(UrlProtocol.Libsql, UrlProtocol.Https);

export const tursoUploadUrl = (syncUrl: string) =>
  `${syncUrlToHttps(syncUrl)}/v1/upload`;

const sha256hex = async (input: string) => {
  const data = new TextEncoder().encode(input);
  const digest = await getSubtle().digest('SHA-256', data);

  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

const userIdToIndex = async (userId: string) =>
  (await sha256hex(userId)).substring(0, 13);

// A bare `<hash13>` can never satisfy userOwnsVault, so every vault is suffixed.
export const DEFAULT_VAULT_NAME = 'default';

export const TURSO_DB_GROUP = 'deadrop';

export const TURSO_DB_SIZE_LIMIT = '100mb';

// The shared prefix of every vault a user owns. Only for filtering an
// org-wide list down to one user — never a database name in its own right.
export const vaultPrefixFromUserId = async (userId: string) =>
  `${await userIdToIndex(userId)}-`;

export const vaultNameFromUserId = async (
  userId: string,
  vaultName: string = DEFAULT_VAULT_NAME,
) => {
  const userIndex = await userIdToIndex(userId);
  const name = vaultName.trim() || DEFAULT_VAULT_NAME;

  return [userIndex, name].join('-').substring(0, 63);
};

export const userOwnsVault = async (
  userId: string,
  vaultName: string,
) => {
  const userIndex = await userIdToIndex(userId);

  return vaultName.startsWith(`${userIndex}-`);
};
