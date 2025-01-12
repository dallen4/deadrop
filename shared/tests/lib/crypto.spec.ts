import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  decryptRaw,
  deriveKey,
  encryptRaw,
  generateKey,
  generateKeyPair,
  hashRaw,
} from 'lib/crypto/operations';
import { generateIV } from 'lib/util';
import { BaseCrypto, getCrypto } from 'lib/crypto';

describe('crypto operations', () => {
  it('should get instances of `BaseCrypto`', () => {
    const crypto = getCrypto();

    expectTypeOf(crypto).toMatchTypeOf<BaseCrypto>();
  });

  it('should provide symmetric encryption & decryption', async () => {
    const key = await generateKey();

    const iv = generateIV();

    const rawData = 'hello';

    const encryptedData = await encryptRaw(key, iv, rawData);

    const decryptedData = await decryptRaw(key, iv, encryptedData);

    expect(decryptedData).toStrictEqual(rawData);
  });

  it('should generate same hash for same data', async () => {
    const input = 'superSecretString';

    const hash1 = await hashRaw(input);

    const inputCopy = input.toString();

    const hash2 = await hashRaw(inputCopy);

    expect(hash2).toEqual(hash1);
  });

  it('should generate key pair and be able to derive new keys', async () => {
    const { publicKey, privateKey } = await generateKeyPair();

    expect(publicKey).toBeInstanceOf(CryptoKey);
    expect(publicKey.extractable).toBe(true);
    expect(privateKey).toBeInstanceOf(CryptoKey);
    expect(privateKey.extractable).toBe(true);

    const symmetricKey = await deriveKey(privateKey, publicKey);

    expect(symmetricKey).toBeInstanceOf(CryptoKey);
    expect(symmetricKey.extractable).toBe(false);
    expect(symmetricKey.usages).toStrictEqual(['encrypt', 'decrypt']);
  });
});
