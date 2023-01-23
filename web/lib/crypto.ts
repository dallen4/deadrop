import type { DropMessage } from '@shared/types/messages';
import { decrypt, encrypt, hash } from '@shared/lib/crypto/operations';
import { buildFileFromBuffer, readFileAsBuffer } from './files';

export const encryptFile = async (key: CryptoKey, iv: string, input: File) => {
    const fileBuffer = await readFileAsBuffer(input);

    return encrypt(key, iv, fileBuffer);
};

export const decryptFile = (
    key: CryptoKey,
    iv: string,
    data: string,
    meta: NonNullable<DropMessage['meta']>,
) => {
    const bufferTransform = (buffer: ArrayBuffer) =>
        buildFileFromBuffer(buffer, meta);

    return decrypt(key, iv, data, bufferTransform);
};

export const hashFile = async (file: File) => {
    const fileAsArrayBuffer = await readFileAsBuffer(file);
    return hash(fileAsArrayBuffer);
};
