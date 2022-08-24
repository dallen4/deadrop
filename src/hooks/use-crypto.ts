import { useEffect, useRef } from 'react';
import localForage from 'localforage';

const ENCRYPTION_ALGO = 'AES-CBC';
const HASH_ALGO = 'SHA-256';
const KEY_GEN_PARAMS: AesKeyGenParams = {
    name: ENCRYPTION_ALGO,
    length: 256,
};

export const useCrypto = () => {
    const cyrptoRef = useRef<SubtleCrypto>();

    useEffect(() => {
        if (typeof window === 'undefined') return;

        cyrptoRef.current = window.crypto.subtle || (window.crypto as any).webkitSubtle;
    }, []);

    const encode = (input: Record<string, any>) => {
        const data = JSON.stringify(input);
        return Buffer.from(data);
    };

    const decode = (input: ArrayBuffer) => new TextDecoder().decode(input);

    const generateKey = (usages: KeyUsage[] = ['encrypt', 'decrypt']) =>
        cyrptoRef.current!.generateKey(KEY_GEN_PARAMS, true, usages);

    const importKey = (input: JsonWebKey) =>
        cyrptoRef.current!.importKey('jwk', input, KEY_GEN_PARAMS, true, [
            'encrypt',
            'decrypt',
        ]);

    const exportKey = (key: CryptoKey) =>
        cyrptoRef.current!.exportKey('jwk', key).then(JSON.stringify);

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
        cyrptoRef
            .current!.encrypt(
                {
                    name: ENCRYPTION_ALGO,
                    iv: Buffer.from(iv),
                },
                key,
                encode(input),
            )
            .then(decode);

    const decrypt = (
        key: CryptoKey,
        iv: string,
        data: string,
    ): Promise<Record<string, any>> =>
        cyrptoRef
            .current!.decrypt(
                {
                    name: ENCRYPTION_ALGO,
                    iv: Buffer.from(iv),
                },
                key,
                Buffer.from(data),
            )
            .then(decode)
            .then(JSON.parse);

    const hash = async (input: Record<string, any>) => {
        const stringified = JSON.stringify(input);
        const digest = await cyrptoRef.current!.digest(
            HASH_ALGO,
            Buffer.from(stringified),
        );

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
