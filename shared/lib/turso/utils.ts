import { TURSO_ORGANIZATION } from '../constants';

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
