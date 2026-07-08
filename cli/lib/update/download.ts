import { createWriteStream } from 'fs';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import type { ReadableStream as WebReadableStream } from 'stream/web';

export type ProgressListener = (
  received: number,
  total: number,
) => void;

// pure formatting — kept separate from the stream plumbing so it's easy
// to unit test without touching the network or filesystem
export const formatProgressBar = (
  received: number,
  total: number,
  width = 30,
): string => {
  const toMb = (bytes: number) => (bytes / 1_000_000).toFixed(1);

  if (!total) return `Downloading... ${toMb(received)} MB`;

  const ratio = Math.min(received / total, 1);
  const filled = Math.round(ratio * width);
  const bar = '#'.repeat(filled) + '-'.repeat(width - filled);
  const pct = Math.round(ratio * 100);

  return `[${bar}] ${pct}% (${toMb(received)}/${toMb(total)} MB)`;
};

export const downloadWithProgress = async (
  url: string,
  destPath: string,
  onProgress?: ProgressListener,
): Promise<void> => {
  const res = await fetch(url);

  if (!res.ok || !res.body)
    throw new Error(
      `Failed to download ${url} (${res.status} ${res.statusText})`,
    );

  const total = Number(res.headers.get('content-length')) || 0;
  let received = 0;

  const nodeStream = Readable.fromWeb(
    res.body as unknown as WebReadableStream<Uint8Array>,
  );

  if (onProgress)
    nodeStream.on('data', (chunk: Buffer) => {
      received += chunk.length;
      onProgress(received, total);
    });

  await pipeline(nodeStream, createWriteStream(destPath));
};

export const downloadBinaryWithProgress = (
  url: string,
  destPath: string,
): Promise<void> =>
  downloadWithProgress(url, destPath, (received, total) => {
    if (!process.stdout.isTTY) return;

    process.stdout.write(`\r${formatProgressBar(received, total)}`);

    if (total && received >= total) process.stdout.write('\n');
  });
