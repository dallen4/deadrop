import { customAlphabet } from 'nanoid';
import { bufferFromString, getIVBuffer } from '@lib/util';
import { readFileAsBuffer } from '@lib/files';
import { DropMessage } from 'types/messages';

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

    const encryptFile = async (key: CryptoKey, iv: string, input: File) => {
        const fileBuffer = await readFileAsBuffer(input);

        const encryptedBuffer = await tools!.encrypt(
            {
                name: ENCRYPTION_ALGO,
                iv: getIVBuffer(iv),
            },
            key,
            fileBuffer,
        );

        return String.fromCharCode(...new Uint8Array(encryptedBuffer));
    };

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

    const decryptFile = async (
        key: CryptoKey,
        iv: string,
        data: string,
        meta: DropMessage['meta'],
    ) => {
        const decryptedBuffer = await tools!.decrypt(
            {
                name: ENCRYPTION_ALGO,
                iv: getIVBuffer(iv),
            },
            key,
            bufferFromString(data),
        );

        const decryptedFile = new File([decryptedBuffer], meta!.name, {
            type: meta!.type,
        });

        return decryptedFile;
    };

    const hashBase = async (buffer: BufferSource) => {
        const digest = await tools!.digest!(HASH_ALGO, buffer);

        // ref: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#examples
        return Array.from(new Uint8Array(digest))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
    };

    const hash = async (input: Record<string, any>) => {
        const stringified = JSON.stringify(input);
        return hashBase(Buffer.from(stringified));
    };

    const hashFile = async (file: File) => {
        const fileAsArrayBuffer = await readFileAsBuffer(file);
        return hashBase(fileAsArrayBuffer);
    };

    return {
        generateId,
        generateKey,
        generateKeyPair,
        deriveKey,
        importKey,
        exportKey,
        encrypt,
        encryptFile,
        decrypt,
        decryptFile,
        hash,
        hashFile,
    };
};
