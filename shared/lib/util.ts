import { GRAB_PATH } from '../config/paths';
import { customAlphabet } from 'nanoid';
import { alphanumeric } from 'nanoid-dictionary';

export const bufferFromString = (input: string) =>
  Uint8Array.from(input, (char) => char.charCodeAt(0));

export const generateId = () => customAlphabet(alphanumeric, 12)();

export const generateIV = () => {
  // Generate 12 random bytes
  const randomBytes = new Uint8Array(12);
  crypto.getRandomValues(randomBytes);

  // Convert to binary string
  return String.fromCharCode(...randomBytes);
};

export const getIVBuffer = (iv: string) => Buffer.from(iv, 'binary');

export const generateGrabUrl = (url: string, id: string) => {
  const params = new URLSearchParams({ drop: id });
  const baseUrl = new URL(GRAB_PATH, url);

  return `${baseUrl.toString()}?${params.toString()}`;
};

export const formatDropKey = (id: string) => `drop:${id}`;

export const formatCloudSyncUrl = (name: string) =>
  `libsql://${name}-${process.env.TURSO_ORGANIZATION!}.turso.io`;
