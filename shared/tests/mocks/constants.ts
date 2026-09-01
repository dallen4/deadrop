import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

export const filename = 'sampleSecret.json';

// Module-relative: vitest inherits the cwd it was invoked from.
export const filePath = join(
  dirname(fileURLToPath(import.meta.url)),
  filename,
);
export const fileType = 'application/json';
export const fileHash =
  '0acb3809d0403bfa58626a36f0f0a64a6a14f302865913a951188d783ae81549';

export const base64String = 'aGVsbG8gdGhlcmU='; // 'hello there' in base64
