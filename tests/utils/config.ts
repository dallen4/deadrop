import path from 'path';
import { fileURLToPath } from 'url';

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

export const dropTimeout = Number(process.env.XPLAT_DROP_TIMEOUT || 45_000);
export const grabTimeout = Number(process.env.XPLAT_GRAB_TIMEOUT || 45_000);

// The stable drop test token persisted in Redis under `test_tkn` (the worker +
// web /api/captcha verify against it). It does not rotate per run; suites read
// it — never seed or delete it. See DROP_TEST_TOKEN in tests/.env / the repo
// secret.
export const testToken = (): string => {
  const t = process.env.DROP_TEST_TOKEN;
  if (!t)
    throw new Error(
      'DROP_TEST_TOKEN is not set (expected in tests/.env locally or the ' +
        'repo secret in CI).',
    );
  return t;
};
