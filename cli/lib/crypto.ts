import type { DropMessage } from '@shared/types/messages';
import { decrypt, encrypt, hash } from '@shared/lib/crypto/operations';
import { writeFileFromBuffer, readFileAsBuffer } from './files';

export const encryptFile = async (key: CryptoKey, iv: string, path: string) => {
    const fileBuffer = await readFileAsBuffer(path);

    return encrypt(key, iv, fileBuffer);
};

export const decryptFile = async (
    key: CryptoKey,
    iv: string,
    data: string,
    meta: NonNullable<DropMessage['meta']>,
) => {
    const bufferTransform = (buffer: ArrayBuffer) =>
        writeFileFromBuffer(Buffer.from(buffer), meta);

    return decrypt(key, iv, data, bufferTransform);
};

export const hashFile = async (path: string) => {
    const fileAsArrayBuffer = await readFileAsBuffer(path);
    return hash(fileAsArrayBuffer);
};
