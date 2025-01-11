import { describe, expect, it } from 'vitest';
import {
  decryptRaw,
  encryptRaw,
  generateKey,
} from 'lib/crypto/operations';
import { generateIV } from 'lib/util';

describe('drop cryptographic operations', () => {
  it('should provide symmetric encryption & decryption', async () => {
    const key = await generateKey();

    const iv = generateIV();

    const rawData = 'hello';

    const encryptedData = await encryptRaw(key, iv, rawData);

    const decryptedData = await decryptRaw(key, iv, encryptedData);

    expect(decryptedData).toStrictEqual(rawData);
  });
});
