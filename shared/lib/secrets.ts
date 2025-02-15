import { SECRET_VALUE_DELIMITER } from './constants';
import {
  decryptRaw,
  encryptRaw,
  importKeyFromBase64,
} from './crypto/operations';
import { generateIV } from './util';

export async function wrapSecret(key: string, value: string) {
  const iv = generateIV();

  const encryptionKey = await importKeyFromBase64(key, ['encrypt']);

  const encryptedSecret = await encryptRaw(encryptionKey, iv, value);

  return [iv, encryptedSecret].join(SECRET_VALUE_DELIMITER);
}

export async function unwrapSecret(
  key: string,
  wrappedSecret: string,
) {
  const [iv, encryptedValue] = wrappedSecret.split(
    SECRET_VALUE_DELIMITER,
  );

  const decryptionKey = await importKeyFromBase64(key, ['decrypt']);

  return decryptRaw(decryptionKey, iv, encryptedValue);
}
