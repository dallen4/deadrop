import { createHash } from 'crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  computeSha256,
  parseChecksumFile,
  verifyChecksum,
} from 'lib/update/checksum';

describe('parseChecksumFile', () => {
  it('extracts the hash from a `sha256sum`-style file', () => {
    expect(
      parseChecksumFile('abc123  deadrop-darwin-arm64\n'),
    ).toBe('abc123');
  });

  it('extracts the hash when there is no trailing filename', () => {
    expect(parseChecksumFile('abc123\n')).toBe('abc123');
  });
});

describe('computeSha256 / verifyChecksum', () => {
  const dir = mkdtempSync(join(tmpdir(), 'deadrop-update-test-'));
  const filePath = join(dir, 'fixture.bin');
  const content = 'deadrop update checksum fixture';
  const expectedHash = createHash('sha256').update(content).digest('hex');

  beforeAll(() => {
    writeFileSync(filePath, content);
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('computes the sha256 hash of a file', async () => {
    await expect(computeSha256(filePath)).resolves.toBe(expectedHash);
  });

  it('verifies a matching checksum', async () => {
    await expect(verifyChecksum(filePath, expectedHash)).resolves.toBe(
      true,
    );
  });

  it('is case-insensitive when comparing checksums', async () => {
    await expect(
      verifyChecksum(filePath, expectedHash.toUpperCase()),
    ).resolves.toBe(true);
  });

  it('rejects a mismatched checksum', async () => {
    await expect(
      verifyChecksum(filePath, '0'.repeat(64)),
    ).resolves.toBe(false);
  });
});
