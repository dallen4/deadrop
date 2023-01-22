import { bufferFromString, getIVBuffer } from '@shared/lib/util';
import { readFileAsBuffer } from 'lib/files';
import type { DropMessage } from '@shared/types/messages';
import { ENCRYPTION_ALGO, HASH_ALGO } from '@shared/config/crypto';
import { getSubtle } from '@shared/lib/crypto';
import { encode, decode } from '@shared/lib/data';

export const useCrypto = () => {
    const tools = getSubtle();

    const encrypt = (key: CryptoKey, iv: string, input: Record<string, any>) =>
        tools
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

        const encryptedBuffer = await tools.encrypt(
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
        tools
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
        const decryptedBuffer = await tools.decrypt(
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
        const digest = await tools.digest!(HASH_ALGO, buffer);

        // ref: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#examples
        return Array.from(new Uint8Array(digest))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
    };

    const hash = async (input: Record<string, any>) => hashBase(encode(input));

    const hashFile = async (file: File) => {
        const fileAsArrayBuffer = await readFileAsBuffer(file);
        return hashBase(fileAsArrayBuffer);
    };

    return {
        encrypt,
        encryptFile,
        decrypt,
        decryptFile,
        hash,
        hashFile,
    };
};
