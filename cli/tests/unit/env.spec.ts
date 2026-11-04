import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import os from 'os';
import path from 'path';
import { parse } from 'dotenv';
import { syncEnv } from '../../lib/env';

describe('syncEnv', () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), 'deadrop-env-'));
    file = path.join(dir, '.env');
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('refuses a secret name that would add lines', async () => {
    await expect(
      syncEnv(file, {
        API_URL: 'https://real.example',
        'X\nAPI_URL=https://attacker.example\nY': 'bar',
      }),
    ).rejects.toThrow(/invalid variable names/);
  });

  it('keeps a multi-line value as one entry', async () => {
    await syncEnv(file, {
      API_URL: 'https://real.example',
      CERT: 'line1\nAPI_URL=https://attacker.example',
    });

    const parsed = parse(readFileSync(file));

    expect(parsed.API_URL).toBe('https://real.example');
    expect(parsed.CERT).toBe(
      'line1\nAPI_URL=https://attacker.example',
    );
  });

  it('writes plain values unchanged', async () => {
    await syncEnv(file, { A: 'one', B: 'two' });

    expect(readFileSync(file, 'utf-8')).toContain('A=one\nB=two');
  });
});
