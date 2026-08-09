import { execFileSync } from 'child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { homedir, tmpdir } from 'os';
import { join } from 'path';
import { GITHUB_RELEASES_URL } from 'lib/constants';
import { fetchExpectedChecksum, verifyChecksum } from './checksum';
import { downloadWithProgress } from './download';

export const DESKTOP_APP_PATH = '/Applications/deadrop.app';

const LINUX_INSTALL_DIR =
  process.env.DEADROP_INSTALL_DIR ?? join(homedir(), '.local', 'bin');
export const LINUX_APPIMAGE_PATH = join(
  LINUX_INSTALL_DIR,
  'deadrop-desktop.AppImage',
);
const LINUX_VERSION_FILE = join(
  LINUX_INSTALL_DIR,
  '.deadrop-desktop.version',
);

// Best-effort, unverified against a real Windows install — Tauri's NSIS
// bundler is assumed to register the uninstall entry under `productName`
// (tauri.conf.json), matching the default template. Wrapped in try/catch
// below, so a wrong key name just makes getInstalledDesktopVersion()
// degrade to "not installed" rather than throwing.
const WINDOWS_UNINSTALL_KEY =
  'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\deadrop';

export type DesktopRelease = {
  version: string;
  assetUrl: string;
  assetSha256Url: string;
};

function getInstalledDesktopVersionMac(): string | null {
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

// `reg query` is built into every Windows install (no PowerShell
// execution-policy concerns) — reads the DisplayVersion NSIS wrote at
// install time.
function getInstalledDesktopVersionWindows(): string | null {
  try {
    const output = execFileSync(
      'reg',
      ['query', WINDOWS_UNINSTALL_KEY, '/v', 'DisplayVersion'],
      { encoding: 'utf-8' },
    );
    return output.match(/DisplayVersion\s+REG_SZ\s+(\S+)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

// AppImages don't expose version metadata without executing them, so
// installOrUpdateDesktop writes a plain-text sidecar file next to the
// binary at install time and this just reads it back.
function getInstalledDesktopVersionLinux(): string | null {
  if (!existsSync(LINUX_APPIMAGE_PATH) || !existsSync(LINUX_VERSION_FILE))
    return null;

  try {
    return readFileSync(LINUX_VERSION_FILE, 'utf-8').trim() || null;
  } catch {
    return null;
  }
}

// Reads the currently-installed desktop app's version, or null if it
// isn't installed (or the platform isn't supported) — both call sites
// treat that as "nothing to update/detect", not an error.
export function getInstalledDesktopVersion(): string | null {
  switch (process.platform) {
    case 'darwin':
      return getInstalledDesktopVersionMac();
    case 'win32':
      return getInstalledDesktopVersionWindows();
    case 'linux':
      return getInstalledDesktopVersionLinux();
    default:
      return null;
  }
}

// The releases list is shared with the CLI's `deadrop@*` tags — take the
// first entry whose tag is a desktop release, then resolve this
// platform's asset from that release's own asset list rather than
// constructing the filename (it's derived from tauri.conf.json's version
// at build time, not necessarily the git tag).
export async function fetchLatestDesktopRelease(): Promise<DesktopRelease | null> {
  if (!['darwin', 'win32', 'linux'].includes(process.platform)) return null;

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

  // Windows publishes both a `-setup.exe` (NSIS) and a `.msi` — only the
  // NSIS installer supports the silent `/S` flag installOrUpdateDesktop
  // relies on, so match that specifically rather than any `.exe`/`.msi`.
  const asset = release.assets.find((a) =>
    process.platform === 'win32'
      ? a.name.endsWith('-setup.exe')
      : process.platform === 'linux'
        ? a.name.endsWith('.AppImage')
        : a.name.endsWith('.dmg'),
  );
  const assetSha256 = release.assets.find(
    (a) => a.name === `${asset?.name}.sha256`,
  );
  if (!asset || !assetSha256) return null;

  return {
    version: release.tag_name.replace(/^deadrop-desktop@/, ''),
    assetUrl: asset.browser_download_url,
    assetSha256Url: assetSha256.browser_download_url,
  };
}

async function downloadAndVerify(
  release: DesktopRelease,
  destPath: string,
): Promise<void> {
  await downloadWithProgress(release.assetUrl, destPath, (received, total) => {
    if (!process.stdout.isTTY) return;
    const pct = total ? Math.round((received / total) * 100) : 0;
    process.stdout.write(`\rDownloading... ${pct}%`);
    if (total && received >= total) process.stdout.write('\n');
  });

  const expectedChecksum = await fetchExpectedChecksum(
    release.assetSha256Url,
  );
  const valid = await verifyChecksum(destPath, expectedChecksum);
  if (!valid)
    throw new Error('Checksum verification failed — install aborted.');
}

async function installOrUpdateDesktopMac(
  release: DesktopRelease,
): Promise<void> {
  const scratchDir = mkdtempSync(join(tmpdir(), 'deadrop-desktop-'));
  const dmgPath = join(scratchDir, 'deadrop.dmg');

  try {
    await downloadAndVerify(release, dmgPath);

    const mountOutput = execFileSync(
      'hdiutil',
      ['attach', dmgPath, '-nobrowse'],
      { encoding: 'utf-8' },
    );
    const mountPoint = parseMountPoint(mountOutput);

    try {
      if (existsSync(DESKTOP_APP_PATH))
        rmSync(DESKTOP_APP_PATH, { recursive: true });

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

// Tauri's NSIS installer supports silent installs via the standard NSIS
// `/S` flag — installs per-user (no admin prompt) to the default location
// baked into the installer, and registers the uninstall entry
// getInstalledDesktopVersion() reads back.
async function installOrUpdateDesktopWindows(
  release: DesktopRelease,
): Promise<void> {
  const scratchDir = mkdtempSync(join(tmpdir(), 'deadrop-desktop-'));
  const exePath = join(scratchDir, 'deadrop-setup.exe');

  try {
    await downloadAndVerify(release, exePath);
    execFileSync(exePath, ['/S']);
  } finally {
    rmSync(scratchDir, { recursive: true, force: true });
  }
}

// AppImages are self-contained — "installing" is just placing an
// executable file, no package manager involved. Same ~/.local/bin
// convention install.sh already uses for the CLI binary itself.
async function installOrUpdateDesktopLinux(
  release: DesktopRelease,
): Promise<void> {
  const scratchDir = mkdtempSync(join(tmpdir(), 'deadrop-desktop-'));
  const tmpPath = join(scratchDir, 'deadrop-desktop.AppImage');

  try {
    await downloadAndVerify(release, tmpPath);
    chmodSync(tmpPath, 0o755);

    mkdirSync(LINUX_INSTALL_DIR, { recursive: true });
    // copy+unlink, not rename — scratchDir (tmpdir) and LINUX_INSTALL_DIR
    // can be on different filesystems, where rename() fails with EXDEV.
    copyFileSync(tmpPath, LINUX_APPIMAGE_PATH);
    writeFileSync(LINUX_VERSION_FILE, release.version);
  } finally {
    rmSync(scratchDir, { recursive: true, force: true });
  }
}

// Download, verify checksum, and install/update in place. Throws on any
// failure — callers decide how to present it (deadrop desktop install
// treats it as fatal, deadrop update logs it as a non-fatal warning since
// the CLI's own update already succeeded by that point).
export async function installOrUpdateDesktop(
  release: DesktopRelease,
): Promise<void> {
  switch (process.platform) {
    case 'darwin':
      return installOrUpdateDesktopMac(release);
    case 'win32':
      return installOrUpdateDesktopWindows(release);
    case 'linux':
      return installOrUpdateDesktopLinux(release);
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

// Human-readable install location for the post-install message — Windows
// omits one since the NSIS installer, not us, decides where it lands.
export function getDesktopInstallLocation(): string | null {
  switch (process.platform) {
    case 'darwin':
      return DESKTOP_APP_PATH;
    case 'linux':
      return LINUX_APPIMAGE_PATH;
    default:
      return null;
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
