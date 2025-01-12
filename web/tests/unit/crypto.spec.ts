import { generateKey } from '@shared/lib/crypto/operations';
import { generateIV } from '@shared/lib/util';
import { decryptFile, encryptFile, hashFile } from 'lib/crypto';
import { describe, expect, it } from 'vitest';
import {
  filename,
  filePath,
  fileHash,
  fileType,
} from '@shared/tests/mocks/constants';
import { readFile } from 'fs/promises';

describe('crypto operations', async () => {
  const encryptionKey = await generateKey();
  const iv = generateIV();

  const fileContent = await readFile(filePath, { encoding: 'utf-8' });

  const testFile = new File([fileContent], filename, {
    type: fileType,
  });

  it('should encrypt file and return info', async () => {
    const encryptedFile = await encryptFile(
      encryptionKey,
      iv,
      testFile,
    );

    expect(encryptedFile).toBeDefined();
  });

  it('should hash file and consistently compute correct signature', async () => {
    const hash = await hashFile(testFile);

    expect(hash).toBeDefined();
    expect(hash).toEqual(fileHash);
  });

  it('should encrypt & decrypt file and maintain integrity hash', async () => {
    const encryptedFile = await encryptFile(
      encryptionKey,
      iv,
      testFile,
    );

    expect(encryptedFile).toBeDefined();

    const decryptedFile = await decryptFile(
      encryptionKey,
      iv,
      encryptedFile,
      { name: filename, type: fileType },
    );

    const hash = await hashFile(decryptedFile);

    expect(hash).toBeDefined();
    expect(hash).toEqual(fileHash);
  });
});
