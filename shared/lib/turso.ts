enum UrlProtocol {
  File = 'file:',
  Https = 'https://',
  Libsql = 'libsql://',
}

/** Convert a local file path to a libsql file URL. */
export const fileUrl = (path: string) =>
  `${UrlProtocol.File}${path}`;

/** Build a libsql:// sync URL from a Turso hostname. */
export const syncUrl = (hostname: string) =>
  `${UrlProtocol.Libsql}${hostname}`;

/** Convert a libsql:// sync URL to an HTTPS base URL. */
export const syncUrlToHttps = (url: string) =>
  url.replace(UrlProtocol.Libsql, UrlProtocol.Https);

/** Build the Turso upload endpoint for a given sync URL. */
export const tursoUploadUrl = (syncUrl: string) =>
  `${syncUrlToHttps(syncUrl)}/v1/upload`;
