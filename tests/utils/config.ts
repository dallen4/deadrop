import path from 'path';
import { fileURLToPath } from 'url';

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

// Lives in shared/ so web's captcha route can verify the same token
// without a production file reaching into this test workspace.
export { getTestToken } from '@shared/tests/token';
