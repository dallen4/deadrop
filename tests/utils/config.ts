import path from 'path';
import { fileURLToPath } from 'url';
import { testTokenKey } from '@shared/tests/http';
import { getKeyValue } from '@shared/lib/kv';

// ESM-safe __dirname (this file lives at tests/utils/, so ../../ is the repo root)
const currDirectory = path.dirname(fileURLToPath(import.meta.url));

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
  path.join(currDirectory, '..', '..', 'cli', 'dist', 'deadrop.js');

export const dropTimeout = Number(
  process.env.XPLAT_DROP_TIMEOUT || 45_000,
);
export const grabTimeout = Number(
  process.env.XPLAT_GRAB_TIMEOUT || 45_000,
);

// The drop test token lives in Cloudflare kv under `test_tkn`
let cachedToken: string | null = null;

export const getTestToken = async (): Promise<string> => {
  if (cachedToken) return cachedToken;

  if (
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.CLOUDFLARE_API_TOKEN &&
    process.env.CLOUDFLARE_KV_NAMESPACE_ID
  ) {
    const fromCache = await getKeyValue(testTokenKey);

    if (typeof fromCache === 'string' && fromCache)
      return (cachedToken = fromCache);
  }

  const fromEnv = process.env.DROP_TEST_TOKEN;

  if (!fromEnv)
    throw new Error(
      'No test token: set CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN + ' +
        'CLOUDFLARE_KV_NAMESPACE_ID (CI/cache) or DROP_TEST_TOKEN for local runs.',
    );

  return (cachedToken = fromEnv);
};
