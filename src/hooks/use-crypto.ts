import localForage from 'localforage';
import { nanoid } from 'nanoid';
import { bufferFromString } from '@lib/util';

const ENCRYPTION_ALGO = 'AES-GCM';
const HASH_ALGO = 'SHA-256';
const KEY_PARAMS = {
    name: ENCRYPTION_ALGO,
    length: 256,
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

    const generateId = () => nanoid(12);

    const generateKey = (usages: KeyUsage[] = ['encrypt', 'decrypt']) =>
        tools!.generateKey!(KEY_PARAMS, true, usages);

    const importKey = (input: JsonWebKey) =>
        tools!.importKey!('jwk', input, KEY_PARAMS, true, ['encrypt', 'decrypt']);

    const exportKey = (key: CryptoKey) =>
        tools!.exportKey('jwk', key).then(JSON.stringify);

    const storeKey = async (id: string, key: CryptoKey) => {
        const keyString = await exportKey(key);
        return localForage.setItem(id, keyString);
    };

    const getKey = async (id: string) => {
        const keyString = await localForage.getItem<string>(id);

        if (!keyString) return null;

        const keyData: JsonWebKey = JSON.parse(keyString);

        return importKey(keyData);
    };

    const encrypt = (key: CryptoKey, iv: string, input: Record<string, any>) =>
        tools!
            .encrypt(
                {
                    name: ENCRYPTION_ALGO,
                    iv: Buffer.from(iv),
                },
                key,
                encode(input),
            )
            .then(buffer => String.fromCharCode(...new Uint8Array(buffer)));

    const decrypt = (
        key: CryptoKey,
        iv: string,
        data: string,
    ): Promise<Record<string, any>> =>
        tools!
            .decrypt(
                {
                    name: ENCRYPTION_ALGO,
                    iv: Buffer.from(iv),
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

    const checkHash = async (input: Record<string, any>, checksum: string) => {
        const inputHash = await hash(input);
        return inputHash === checksum;
    };

    return {
        generateId,
        generateKey,
        storeKey,
        importKey,
        exportKey,
        getKey,
        encrypt,
        decrypt,
        hash,
        checkHash,
    };
};
