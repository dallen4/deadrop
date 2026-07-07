import { SECRET_VALUE_DELIMITER } from './constants';
import {
  decryptRaw,
  encryptRaw,
  importKeyFromBase64,
} from './crypto/operations';
import { base64FromBuffer, bufferFromBase64 } from './data';
import { bufferFromString, generateIV } from './util';

// IV/ciphertext are raw binary strings; base64-encode before joining
// so the delimiter and storage layer never see embedded NUL/control bytes.
const toBase64 = (binaryString: string) =>
  base64FromBuffer(bufferFromString(binaryString).buffer);

const fromBase64 = (base64: string) =>
  String.fromCharCode(...new Uint8Array(bufferFromBase64(base64)));

export async function wrapSecret(key: string, value: string) {
  const iv = generateIV();

  const encryptionKey = await importKeyFromBase64(key, ['encrypt']);

  const encryptedSecret = await encryptRaw(encryptionKey, iv, value);

  return [toBase64(iv), toBase64(encryptedSecret)].join(
    SECRET_VALUE_DELIMITER,
  );
}

export async function unwrapSecret(
  key: string,
  wrappedSecret: string,
) {
  const [iv, encryptedValue] = wrappedSecret
    .split(SECRET_VALUE_DELIMITER)
    .map(fromBase64);

  const decryptionKey = await importKeyFromBase64(key, ['decrypt']);

  return decryptRaw(decryptionKey, iv, encryptedValue);
}
