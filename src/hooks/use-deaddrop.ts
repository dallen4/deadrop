import { useCrypto } from './use-crypto';
import { nanoid } from 'nanoid';
import localForage from 'localforage';

export const useDeadDrop = () => {
    const { generateKey, generateId, storeKey, importKey, encrypt, decrypt } = useCrypto();

    const drop = async (input: Record<string, any>) => {
        const id = generateId();

        const encryptionKey = await generateKey();
        const encrypted = await encrypt(encryptionKey, id, input);

        const keyString = await storeKey(id, encryptionKey);

        // write key to redis

        return id;
    };

    const pickup = async (id: string) => {
        // get from redis

        const keyInput: JsonWebKey = JSON.parse('');

        const key = await importKey(keyInput);

        // get encrypted package from rerdis

        const encrypted = '';

        return decrypt(key, id, encrypted);
    };

    return {
        drop,
    };
};
