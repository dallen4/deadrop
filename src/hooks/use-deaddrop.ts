import { useCrypto } from './use-crypto';
import { nanoid } from 'nanoid';
import localForage from 'localforage';

export const useDeadDrop = () => {
    const { generateKeyPair, generateId, storeKey, importKey, encrypt, decrypt } = useCrypto();

    const drop = async (input: Record<string, any>) => {
        const id = generateId();

        const encryptionKey = await generateKeyPair();
        const encrypted = await encrypt(encryptionKey.publicKey, id, input);

        const keyString = await storeKey(id, encryptionKey.publicKey);

        return id;
    };

    const pickup = async (id: string) => {
        // get from redis

        const keyInput: JsonWebKey = JSON.parse('');

        const key = await importKey(keyInput, ['decrypt']);

        // get encrypted package from rerdis

        const encrypted = '';

        return decrypt(key, id, encrypted);
    };

    return {
        drop,
    };
};
