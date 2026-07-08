import { randomUUID } from 'crypto';
import { chmodSync, renameSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  GITHUB_REPO,
  releaseAssetUrl,
  resolveReleaseAssetName,
} from 'lib/constants';
import { logInfo } from 'lib/log';
import { fetchExpectedChecksum, verifyChecksum } from './checksum';
import { downloadBinaryWithProgress } from './download';
import { fetchLatestBinaryVersion, isNewerVersion } from './version';

export const RELEASES_PAGE_URL = `https://github.com/${GITHUB_REPO}/releases`;

// Atomic replace: the currently-running process keeps executing off the
// unlinked old inode, so this is safe to call while `deadrop` is running.
export const replaceRunningBinary = (
  tmpPath: string,
  targetPath: string = process.execPath,
): void => {
  chmodSync(tmpPath, 0o755);
  renameSync(tmpPath, targetPath);
};

export async function updateBinaryInstall(
  currentVersion: string,
): Promise<void> {
  const latest = await fetchLatestBinaryVersion();

  if (!isNewerVersion(latest, currentVersion)) {
    logInfo(`Already on the latest version (v${currentVersion})`);
    return;
  }

  // install.sh (and the release matrix it downloads from) never supported
  // Windows — a win32 binary user got here by hand-downloading the .exe,
  // so an in-place self-replace isn't attempted; point back to Releases.
  if (process.platform === 'win32') {
    logInfo(
      `A newer version (v${latest}) is available, but automatic ` +
        `updates aren't supported on Windows yet. Download it manually:\n` +
        RELEASES_PAGE_URL,
    );
    return;
  }

  const tag = `deadrop@${latest}`;
  const assetName = resolveReleaseAssetName();
  const assetUrl = releaseAssetUrl(tag, assetName);
  const tmpPath = join(tmpdir(), `${assetName}-${randomUUID()}`);

  logInfo(`Downloading deadrop v${latest}...`);

  await downloadBinaryWithProgress(assetUrl, tmpPath);

  const expectedChecksum = await fetchExpectedChecksum(`${assetUrl}.sha256`);
  const valid = await verifyChecksum(tmpPath, expectedChecksum);

  if (!valid) {
    unlinkSync(tmpPath);
    throw new Error('Checksum verification failed — update aborted.');
  }

  replaceRunningBinary(tmpPath);

  logInfo(`v${currentVersion} → v${latest}`);
}
