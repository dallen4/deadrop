import { execFileSync } from 'child_process';
import { existsSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { GITHUB_RELEASES_URL } from 'lib/constants';
import { fetchExpectedChecksum, verifyChecksum } from './checksum';
import { downloadWithProgress } from './download';

export const DESKTOP_APP_PATH = '/Applications/deadrop.app';

export type DesktopRelease = {
  version: string;
  dmgUrl: string;
  dmgSha256Url: string;
};

// Reads CFBundleShortVersionString via `plutil -extract ... raw` — always
// present on macOS, handles both binary and XML plist formats (unlike
// `defaults read`, which has awkward path/domain ambiguity). Treats any
// failure (not installed, malformed Info.plist) as "not installed" rather
// than throwing — both call sites want that conservative fallback.
export function getInstalledDesktopVersion(): string | null {
  if (!existsSync(DESKTOP_APP_PATH)) return null;

  try {
    return execFileSync(
      'plutil',
      [
        '-extract',
        'CFBundleShortVersionString',
        'raw',
        join(DESKTOP_APP_PATH, 'Contents', 'Info.plist'),
      ],
      { encoding: 'utf-8' },
    ).trim();
  } catch {
    return null;
  }
}

// The releases list is shared with the CLI's `deadrop@*` tags — take the
// first entry whose tag is a desktop release, then resolve the .dmg/.sha256
// asset names from that release's own asset list rather than constructing
// them from the tag (the .dmg's filename is derived from tauri.conf.json's
// version at build time, not necessarily the git tag).
export async function fetchLatestDesktopRelease(): Promise<DesktopRelease | null> {
  const res = await fetch(GITHUB_RELEASES_URL);

  if (!res.ok)
    throw new Error(
      `Failed to fetch releases (${res.status} ${res.statusText})`,
    );

  const releases = (await res.json()) as Array<{
    tag_name: string;
    assets: Array<{ name: string; browser_download_url: string }>;
  }>;

  const release = releases.find((r) =>
    /^deadrop-desktop@/.test(r.tag_name),
  );
  if (!release) return null;

  const dmg = release.assets.find((a) => a.name.endsWith('.dmg'));
  const dmgSha256 = release.assets.find((a) =>
    a.name.endsWith('.dmg.sha256'),
  );
  if (!dmg || !dmgSha256) return null;

  return {
    version: release.tag_name.replace(/^deadrop-desktop@/, ''),
    dmgUrl: dmg.browser_download_url,
    dmgSha256Url: dmgSha256.browser_download_url,
  };
}

// Download, verify checksum, mount, copy to /Applications (replacing any
// existing install), unmount. Throws on any failure — callers decide how
// to present it (deadrop desktop install treats it as fatal, deadrop
// update logs it as a non-fatal warning since the CLI's own update already
// succeeded by that point).
export async function installOrUpdateDesktop(
  release: DesktopRelease,
): Promise<void> {
  const scratchDir = mkdtempSync(join(tmpdir(), 'deadrop-desktop-'));
  const dmgPath = join(scratchDir, 'deadrop.dmg');

  try {
    await downloadWithProgress(release.dmgUrl, dmgPath, (received, total) => {
      if (!process.stdout.isTTY) return;
      const pct = total ? Math.round((received / total) * 100) : 0;
      process.stdout.write(`\rDownloading... ${pct}%`);
      if (total && received >= total) process.stdout.write('\n');
    });

    const expectedChecksum = await fetchExpectedChecksum(
      release.dmgSha256Url,
    );
    const valid = await verifyChecksum(dmgPath, expectedChecksum);
    if (!valid)
      throw new Error('Checksum verification failed — install aborted.');

    const mountOutput = execFileSync(
      'hdiutil',
      ['attach', dmgPath, '-nobrowse'],
      { encoding: 'utf-8' },
    );
    const mountPoint = parseMountPoint(mountOutput);

    try {
      if (existsSync(DESKTOP_APP_PATH)) rmSync(DESKTOP_APP_PATH, { recursive: true });

      execFileSync('ditto', [
        join(mountPoint, 'deadrop.app'),
        DESKTOP_APP_PATH,
      ]);
    } finally {
      execFileSync('hdiutil', ['detach', mountPoint, '-quiet']);
    }
  } finally {
    rmSync(scratchDir, { recursive: true, force: true });
  }
}

// `hdiutil attach` prints a table of device nodes; only the mounted
// data volume's row has a trailing /Volumes/... path. Grepping for that
// substring is simpler and more robust than parsing the table's column
// layout (matches the common shell idiom for this exact problem).
export function parseMountPoint(attachOutput: string): string {
  const match = attachOutput.match(/\/Volumes\/\S+/);
  if (!match) throw new Error('Could not determine hdiutil mount point');
  return match[0];
}
