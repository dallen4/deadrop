import type { DropMessage } from '@shared/types/messages';
import path from 'path';
import { readFileSync, writeFileSync } from 'fs';

export const writeFileFromBuffer = async (
  fileBuffer: Uint8Array,
  meta: NonNullable<DropMessage['meta']>,
) => {
  const filePath = path.resolve(process.cwd(), meta.name);

  writeFileSync(filePath, fileBuffer);

  return filePath;
};

export const readFileAsBuffer = async (shortPath: string) => {
  const filePath = path.resolve(process.cwd(), shortPath);
  return readFileSync(filePath);
};
