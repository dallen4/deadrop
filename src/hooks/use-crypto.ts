import { customAlphabet } from 'nanoid';
import { bufferFromString, getIVBuffer } from '@lib/util';

const { alphanumeric } = require('nanoid-dictionary');

const ENCRYPTION_ALGO = 'AES-GCM';
const HASH_ALGO = 'SHA-256';
const DERIVED_KEY_PARAMS: AesDerivedKeyParams = {
    name: ENCRYPTION_ALGO,
    length: 256,
};

const KEY_PAIR_PARAMS: EcKeyGenParams & EcKeyImportParams = {
    name: 'ECDH',
    namedCurve: 'P-384',
};

export const useCrypto = () => {
    const tools =
        typeof window !== 'undefined'
            ? window.crypto.subtle ||
              ((window.crypto as any).webkitSubtle as SubtleCrypto)
            : undefined;

    const encode = (input: Record<string, any>) => {
        const data = JSON.stringify(input);
        return Buffer.from(data);
    };

    const decode = (input: ArrayBuffer) => new TextDecoder().decode(input);

    const generateId = () => customAlphabet(alphanumeric, 12)();

    const generateKey = () =>
        tools!.generateKey({ name: 'AES-GCM', length: 256 }, true, [
            'encrypt',
            'decrypt',
        ]);

    const generateKeyPair = () =>
        tools!.generateKey(KEY_PAIR_PARAMS, true, ['deriveKey']);

    const deriveKey = (privateKey: CryptoKey, publicKey: CryptoKey) =>
        window.crypto.subtle.deriveKey(
            {
                name: 'ECDH',
                public: publicKey,
            },
            privateKey,
            DERIVED_KEY_PARAMS,
            false,
            ['encrypt', 'decrypt'],
        );

    const importKey = (input: string, usages: KeyUsage[]) =>
        tools!.importKey('jwk', JSON.parse(input), KEY_PAIR_PARAMS, true, usages);

    const exportKey = (key: CryptoKey) =>
        tools!.exportKey('jwk', key).then(JSON.stringify);

    const encrypt = (key: CryptoKey, iv: string, input: Record<string, any>) =>
        tools!
            .encrypt(
                {
                    name: ENCRYPTION_ALGO,
                    iv: getIVBuffer(iv),
                },
                key,
                encode(input),
            )
            .then((buffer) => String.fromCharCode(...new Uint8Array(buffer)));

    const decrypt = (
        key: CryptoKey,
        iv: string,
        data: string,
    ): Promise<Record<string, any>> =>
        tools!
            .decrypt(
                {
                    name: ENCRYPTION_ALGO,
                    iv: getIVBuffer(iv),
                },
                key,
                bufferFromString(data),
            )
            .then(decode)
            .then(JSON.parse);

    const hash = async (input: Record<string, any>) => {
        const stringified = JSON.stringify(input);
        const digest = await tools!.digest!(HASH_ALGO, Buffer.from(stringified));

        // ref: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#examples
        const hash = Array.from(new Uint8Array(digest))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');

        return hash;
    };

    return {
        generateId,
        generateKey,
        generateKeyPair,
        deriveKey,
        importKey,
        exportKey,
        encrypt,
        decrypt,
        hash,
    };
};
