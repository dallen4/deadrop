import { cosmiconfig } from 'cosmiconfig';
import { existsSync } from 'fs';
import { writeFile } from 'fs/promises';
import { STORAGE_DIR_NAME } from 'lib/constants';
import { cwd } from 'process';
import { stringify } from 'yaml';

type AuthCache = {
  //   username: string;
  token: string;
  lastAuthenticated: number;
};

const getAuthCachePath = () => {
  const dirPath = `${cwd()}/${STORAGE_DIR_NAME}/creds`;

  return dirPath;
};

export async function readAuthCache() {
  const cachePath = getAuthCachePath();
  const cacheExists = existsSync(cachePath);

  if (!cacheExists) return null;

  const { load } = cosmiconfig('deadrop');

  const authCacheConfig = await load(getAuthCachePath());

  return authCacheConfig!.config as AuthCache;
}

export async function writeAuthCache(cache: AuthCache) {
  const configString = stringify(cache);

  await writeFile(getAuthCachePath(), configString);
}

export async function getToken() {
  const authCache = await readAuthCache();

  return authCache?.token ?? '';
}

export async function setSession(token: string) {
  await writeAuthCache({
    token,
    lastAuthenticated: Date.now(),
  });
}
