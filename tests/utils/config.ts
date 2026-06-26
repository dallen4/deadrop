import path from 'path';
import { fileURLToPath } from 'url';
import { Redis } from '@upstash/redis';
import { testTokenKey } from '@shared/tests/http';

// ESM-safe __dirname (this file lives at tests/utils/, so ../../ is the repo root)
const here = path.dirname(fileURLToPath(import.meta.url));

// Vitest runs through Vite, which injects its own `BASE_URL` (the base public
// path, defaults to "/") into process.env and clobbers anything we set under
// that name. So the deployed-app URL is namespaced under XPLAT_BASE_URL to dodge
// the collision.
const raw = process.env.XPLAT_BASE_URL || 'https://alpha.deadrop.io/';

/** Deployed web app (trailing slash normalized). */
export const baseURL = raw.endsWith('/') ? raw : `${raw}/`;

/** Deployed worker. */
export const apiURL = process.env.DEADROP_API_URL!;

/** Built CLI entry the CliProcess spawns. Override with CLI_ENTRY. */
export const cliEntry =
  process.env.CLI_ENTRY ||
  path.join(here, '..', '..', 'cli', 'dist', 'deadrop.js');

export const dropTimeout = Number(
  process.env.XPLAT_DROP_TIMEOUT || 45_000,
);
export const grabTimeout = Number(
  process.env.XPLAT_GRAB_TIMEOUT || 45_000,
);

// The drop test token lives in Redis under `test_tkn` — the worker and the
// web /api/captcha both verify against it
let cachedToken: string | null = null;
let redis: Redis | undefined;

const getRedis = () =>
  (redis ??= new Redis({
    url: process.env.REDIS_REST_URL!,
    token: process.env.REDIS_REST_TOKEN!,
  }));

export const getTestToken = async (): Promise<string> => {
  if (cachedToken) return cachedToken;

  if (process.env.REDIS_REST_URL && process.env.REDIS_REST_TOKEN) {
    const fromRedis = await getRedis().get<string>(testTokenKey);
    if (typeof fromRedis === 'string' && fromRedis)
      return (cachedToken = fromRedis);
  }

  const fromEnv = process.env.DROP_TEST_TOKEN;
  if (!fromEnv)
    throw new Error(
      'No test token: set REDIS_REST_URL + REDIS_REST_TOKEN (CI/Redis) ' +
        'or DROP_TEST_TOKEN (tests/.env) for local runs.',
    );

  return (cachedToken = fromEnv);
};
