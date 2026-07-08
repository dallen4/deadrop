import { createHash } from 'crypto';
import { createReadStream } from 'fs';

export const computeSha256 = (filePath: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });

// install.sh generates checksum files via `sha256sum $f > $f.sha256`,
// i.e. `<hex>  <filename>` — only the first token matters
export const parseChecksumFile = (content: string): string =>
  content.trim().split(/\s+/)[0];

export const fetchExpectedChecksum = async (
  checksumUrl: string,
): Promise<string> => {
  const res = await fetch(checksumUrl);

  if (!res.ok)
    throw new Error(
      `Failed to fetch checksum (${res.status} ${res.statusText})`,
    );

  return parseChecksumFile(await res.text());
};

export const verifyChecksum = async (
  filePath: string,
  expectedHex: string,
): Promise<boolean> => {
  const actual = await computeSha256(filePath);

  return actual.toLowerCase() === expectedHex.toLowerCase();
};
