import { decrypt, encrypt, hash } from '@shared/lib/crypto/operations';
import { buildFileFromBuffer, readFileAsBuffer } from './files';
import type { DropMessage } from '@shared/types/messages';

export const encryptFile = async (key: CryptoKey, iv: string, input: File) => {
    const fileBuffer = await readFileAsBuffer(input);

    return encrypt(key, iv, fileBuffer);
};

export const decryptFile = async (
    key: CryptoKey,
    iv: string,
    data: string,
    meta: NonNullable<DropMessage['meta']>,
) => {
    const bufferTransform = (buffer: ArrayBuffer) =>
        buildFileFromBuffer(buffer, meta);

    const decryptedFile = await decrypt(key, iv, data, bufferTransform);

    return decryptedFile;
};

export const hashFile = async (file: File) => {
    const fileAsArrayBuffer = await readFileAsBuffer(file);
    return hash(fileAsArrayBuffer);
};
