enum UrlProtocol {
  File = 'file:',
  Https = 'https://',
  Libsql = 'libsql://',
}

export const fileUrl = (path: string) =>
  `${UrlProtocol.File}${path}`;

export const syncUrl = (hostname: string) =>
  `${UrlProtocol.Libsql}${hostname}`;

export const syncUrlToHttps = (url: string) =>
  url.replace(UrlProtocol.Libsql, UrlProtocol.Https);

export const tursoUploadUrl = (syncUrl: string) =>
  `${syncUrlToHttps(syncUrl)}/v1/upload`;
