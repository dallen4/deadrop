import {
    DERIVED_KEY_PARAMS,
    ENCRYPTION_ALGO,
    KEY_PAIR_PARAMS,
} from '../../config/crypto';
import { getSubtle } from '.';
import { bufferFromString, getIVBuffer } from '../util';
import { decode } from '../data';
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
            name: 'ECDH',
            public: publicKey,
        },
        privateKey,
        DERIVED_KEY_PARAMS,
        false,
        usages,
    );

export const importKey = (input: string, usages: KeyUsage[]) =>
    getSubtle().importKey(
        'jwk',
        JSON.parse(input),
        KEY_PAIR_PARAMS,
        true,
        usages,
    );

export const exportKey = (key: CryptoKey) =>
    getSubtle().exportKey('jwk', key).then(JSON.stringify);

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
