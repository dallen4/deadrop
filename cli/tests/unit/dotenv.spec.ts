import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { applyWithheldDotenv, loadDotenv } from '../../lib/dotenv';

const KEYS = [
  'DEADROP_VAULT_KEY',
  'DEADROP_API_KEY',
  'H_DOTENV_EXTRA',
];

describe('loadDotenv', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'deadrop-dotenv-'));
  const file = path.join(dir, '.env');

  const writeEnv = () =>
    writeFileSync(
      file,
      'DEADROP_VAULT_KEY=from-file\n' +
        'DEADROP_API_KEY=ak_from_file\n' +
        'H_DOTENV_EXTRA=from-file\n',
    );

  afterEach(() => KEYS.forEach((key) => delete process.env[key]));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('takes the API key but not vault-selecting variables from a .env file', () => {
    writeEnv();

    loadDotenv(file);

    expect(process.env.DEADROP_VAULT_KEY).toBeUndefined();
    expect(process.env.DEADROP_API_KEY).toBe('ak_from_file');
    expect(process.env.H_DOTENV_EXTRA).toBe('from-file');

    applyWithheldDotenv();

    expect(process.env.DEADROP_VAULT_KEY).toBe('from-file');
  });

  it('keeps exported values over the .env, with or without --ci', () => {
    writeEnv();
    process.env.DEADROP_VAULT_KEY = 'exported';
    process.env.DEADROP_API_KEY = 'ak_exported';
    process.env.H_DOTENV_EXTRA = 'exported';

    loadDotenv(file);
    applyWithheldDotenv();

    expect(process.env.DEADROP_VAULT_KEY).toBe('exported');
    expect(process.env.DEADROP_API_KEY).toBe('ak_exported');
    expect(process.env.H_DOTENV_EXTRA).toBe('exported');
  });
});
