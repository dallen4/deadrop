import {
    DERIVED_KEY_PARAMS,
    ENCRYPTION_ALGO,
    HASH_ALGO,
    KEY_FMT,
    KEY_PAIR_PARAMS,
} from '../../config/crypto';
import { getSubtle } from '.';
import { bufferFromString, getIVBuffer } from '../util';
import { encode } from '../data';
import { decodeJsonBuffer } from './util';

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

export const importKey = (input: string, usages: KeyUsage[]) =>
    getSubtle().importKey(
        KEY_FMT,
        JSON.parse(input),
        KEY_PAIR_PARAMS,
        true,
        usages,
    );

export const exportKey = (key: CryptoKey) =>
    getSubtle().exportKey(KEY_FMT, key).then(JSON.stringify);

export const encrypt = (key: CryptoKey, iv: string, input: BufferSource) =>
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

export const decryptJson = (
    key: CryptoKey,
    iv: string,
    data: string,
): Promise<Record<string, any>> => decrypt(key, iv, data, decodeJsonBuffer);

export const hash = async (buffer: BufferSource) => {
    const digest = await getSubtle().digest!(HASH_ALGO, buffer);

    // ref: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#examples
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
};

export const hashJson = (input: Record<string, any>) => hash(encode(input));
