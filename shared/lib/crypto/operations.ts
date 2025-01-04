import {
  DERIVED_KEY_PARAMS,
  ENCRYPTION_ALGO,
  HASH_ALGO,
  KEY_FMT,
  KEY_PAIR_PARAMS,
} from '../../config/crypto';
import { getSubtle } from '.';
import { bufferFromString, getIVBuffer } from '../util';
import {
  base64FromBuffer,
  bufferFromBase64,
  decode,
  encode,
  encodeJson,
} from '../data';

export const generateKey = () =>
  getSubtle().generateKey(
    { name: ENCRYPTION_ALGO, length: 256 },
    true,
    ['encrypt', 'decrypt'],
  ) as Promise<CryptoKey>;

export const generateKeyPair = () =>
  getSubtle().generateKey(KEY_PAIR_PARAMS, true, ['deriveKey']);

export const deriveKey = (
  privateKey: CryptoKey,
  publicKey: CryptoKey,
  usages: Array<KeyUsage> = ['encrypt', 'decrypt'],
) =>
  getSubtle().deriveKey(
    {
      name: KEY_PAIR_PARAMS.name,
      public: publicKey,
    },
    privateKey,
    DERIVED_KEY_PARAMS,
    false,
    usages,
  );

export const importKeyFromBase64 = (
  input: string,
  usages: KeyUsage[],
) =>
  getSubtle().importKey(
    'raw',
    bufferFromBase64(input),
    ENCRYPTION_ALGO,
    true,
    usages,
  );

export const importKey = (input: string, usages: KeyUsage[]) =>
  getSubtle().importKey(
    KEY_FMT,
    JSON.parse(input),
    KEY_PAIR_PARAMS,
    true,
    usages,
  );

export const exportKeyToBase64 = (key: CryptoKey) =>
  getSubtle().exportKey('raw', key).then(base64FromBuffer);

export const exportKey = (key: CryptoKey) =>
  getSubtle().exportKey(KEY_FMT, key).then(JSON.stringify);

export const encrypt = (
  key: CryptoKey,
  iv: string,
  input: BufferSource,
) =>
  getSubtle()
    .encrypt(
      {
        name: ENCRYPTION_ALGO,
        iv: getIVBuffer(iv),
      },
      key,
      input,
    )
    .then((buffer) => String.fromCharCode(...new Uint8Array(buffer)));

export const encryptJson = (
  key: CryptoKey,
  iv: string,
  data: Record<string, any>,
) => encrypt(key, iv, encodeJson(data));

export const encryptRaw = (
  key: CryptoKey,
  iv: string,
  data: string,
) => encrypt(key, iv, encode(data));

export const decrypt = <Result>(
  key: CryptoKey,
  iv: string,
  data: string,
  transform: (value: ArrayBuffer) => Result,
) =>
  getSubtle()
    .decrypt(
      {
        name: ENCRYPTION_ALGO,
        iv: getIVBuffer(iv),
      },
      key,
      bufferFromString(data),
    )
    .then(transform);

export const decryptRaw = (
  key: CryptoKey,
  iv: string,
  data: string,
) => decrypt(key, iv, data, decode);

export const hash = async (buffer: BufferSource) => {
  const digest = await getSubtle().digest!(HASH_ALGO, buffer);

  // ref: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#examples
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

export const hashRaw = (input: string) => hash(encode(input));
