import type { DropMessage } from '@shared/types/messages';
import {
  decrypt,
  decryptRaw,
  encrypt,
  encryptRaw,
  hash,
  importKeyFromBase64,
} from '@shared/lib/crypto/operations';
import { writeFileFromBuffer, readFileAsBuffer } from './files';
import mime from 'mime';
import { generateIV } from '@shared/lib/util';
import { SECRET_VALUE_DELIMITER } from './constants';

export const encryptFile = async (
  key: CryptoKey,
  iv: string,
  path: string,
) => {
  const fileBuffer = await readFileAsBuffer(path);

  const name = path.split('/').pop()!;
  const type = mime.getType(path);
  const encryptedFile = await encrypt(key, iv, fileBuffer);

  return {
    data: encryptedFile,
    name,
    type: type as string,
  };
};

export const decryptFile = async (
  key: CryptoKey,
  iv: string,
  data: string,
  meta: NonNullable<DropMessage['meta']>,
) => {
  const bufferTransform = (buffer: ArrayBuffer) =>
    writeFileFromBuffer(Buffer.from(buffer), meta);

  return decrypt(key, iv, data, bufferTransform);
};

export const hashFile = async (path: string) => {
  const fileAsArrayBuffer = await readFileAsBuffer(path);
  return hash(fileAsArrayBuffer);
};

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
