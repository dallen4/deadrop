import type { DropMessage } from '@shared/types/messages';
import path from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';

// The name comes from the dropper, so keep only its last segment and never
// overwrite: a grab must not be able to place or replace files elsewhere.
const safeFileName = (name: string) => {
  const base = path.basename(name.replace(/\\/g, '/'));

  if (!base || base === '.' || base === '..' || base.includes('\0'))
    throw new Error('Invalid file name received from dropper.');

  return base;
};

const nextFreePath = (dir: string, name: string) => {
  const { name: stem, ext } = path.parse(name);
  let candidate = path.join(dir, name);

  for (let i = 1; existsSync(candidate); i++)
    candidate = path.join(dir, `${stem} (${i})${ext}`);

  return candidate;
};

export const writeFileFromBuffer = async (
  fileBuffer: Uint8Array,
  meta: NonNullable<DropMessage['meta']>,
) => {
  const filePath = nextFreePath(
    process.cwd(),
    safeFileName(meta.name),
  );

  writeFileSync(filePath, fileBuffer, { flag: 'wx', mode: 0o600 });

  return filePath;
};

export const readFileAsBuffer = async (shortPath: string) => {
  const filePath = path.resolve(process.cwd(), shortPath);
  return readFileSync(filePath);
};
