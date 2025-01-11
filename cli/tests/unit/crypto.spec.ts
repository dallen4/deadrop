import { generateKey } from '@shared/lib/crypto/operations';
import { generateIV } from '@shared/lib/util';
import { encryptFile, hashFile } from 'lib/crypto';
import { describe, expect, it } from 'vitest';
import {
  filename,
  filePath,
  fileHash,
  fileType,
} from '@shared/tests/mocks/constants';

describe('crypto operations', async () => {
  const encryptionKey = await generateKey();
  const iv = generateIV();

  it('should encrypt file and return info', async () => {
    const { data, name, type } = await encryptFile(
      encryptionKey,
      iv,
      filePath,
    );

    expect(data).toBeDefined();
    expect(name).toEqual(filename);
    expect(type).toEqual(fileType);
  });

  it('should hash file and consistently compute correct signature', async () => {
    const hash = await hashFile(filePath);

    expect(hash).toBeDefined();
    expect(hash).toEqual(fileHash);
  });
});
