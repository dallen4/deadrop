import { execFileSync } from 'child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { homedir, tmpdir } from 'os';
import { join } from 'path';

const ICON_NAME = 'deadrop';
const ENTRY_NAME = 'deadrop.desktop';

const dataHome = (): string =>
  process.env.XDG_DATA_HOME ?? join(homedir(), '.local', 'share');

export const desktopEntryPath = (): string =>
  join(dataHome(), 'applications', ENTRY_NAME);

const iconPath = (size: number): string =>
  join(
    dataHome(),
    'icons',
    'hicolor',
    `${size}x${size}`,
    'apps',
    `${ICON_NAME}.png`,
  );

// Width/height sit at fixed offsets in a PNG's IHDR — enough to pick a
// hicolor bucket without decoding the image.
function readSquarePngSize(buf: Buffer): number | null {
  if (buf.length < 24) return null;
  if (buf.readUInt32BE(0) !== 0x89504e47) return null;
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return width === height && width > 0 ? width : null;
}

// Largest first — `.DirIcon` is only a 32x32 symlink, which looks poor in a
// launcher. --appimage-extract reads the squashfs directly, so no FUSE.
const ICON_CANDIDATES = [
  'usr/share/icons/hicolor/256x256@2/apps/deadrop.png',
  'usr/share/icons/hicolor/128x128/apps/deadrop.png',
  '.DirIcon',
];

function extractIcon(appImagePath: string): Buffer | null {
  const scratch = mkdtempSync(join(tmpdir(), 'deadrop-icon-'));
  try {
    for (const candidate of ICON_CANDIDATES) {
      try {
        execFileSync(appImagePath, ['--appimage-extract', candidate], {
          cwd: scratch,
          stdio: 'ignore',
        });
      } catch {
        continue;
      }
      const extracted = join(scratch, 'squashfs-root', candidate);
      if (existsSync(extracted)) return readFileSync(extracted);
    }
    return null;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

// Neither tool is guaranteed installed, and the entry is already written by
// the time we get here — never fatal.
function refreshDesktopDatabase(): void {
  const commands: Array<[string, string[]]> = [
    ['update-desktop-database', [join(dataHome(), 'applications')]],
    ['gtk-update-icon-cache', ['-q', '-t', '-f', join(dataHome(), 'icons')]],
  ];

  for (const [bin, args] of commands) {
    try {
      execFileSync(bin, args, { stdio: 'ignore' });
    } catch {
      // not installed, or nothing to do
    }
  }
}

// Exec must be absolute: ~/.local/bin isn't reliably on PATH, and Exec= is
// not shell-expanded. StartupWMClass ties the running window back to this
// entry, without which the app shows up as a second unnamed dock icon.
function renderEntry(execPath: string, iconValue: string): string {
  return `[Desktop Entry]
Type=Application
Name=deadrop
GenericName=Secret Sharing
Comment=End-to-end encrypted secret sharing
Exec=${execPath}
Icon=${iconValue}
Terminal=false
Categories=Network;FileTransfer;
Keywords=secret;encryption;share;vault;
StartupWMClass=deadrop
`;
}

// Best-effort: a failure here leaves a runnable AppImage that just isn't in
// the app menu, which beats failing the install.
export function installDesktopEntry(appImagePath: string): void {
  let iconValue = ICON_NAME;

  const icon = extractIcon(appImagePath);
  if (icon) {
    const dest = iconPath(readSquarePngSize(icon) ?? 256);
    mkdirSync(join(dest, '..'), { recursive: true });
    writeFileSync(dest, icon);
  } else {
    iconValue = appImagePath;
  }

  const entry = desktopEntryPath();
  mkdirSync(join(entry, '..'), { recursive: true });
  writeFileSync(entry, renderEntry(appImagePath, iconValue));

  refreshDesktopDatabase();
}

// The install picks its hicolor bucket from the extracted PNG's own size, so
// uninstall can't recompute it — sweep every bucket instead.
function removeIcons(): void {
  const hicolor = join(dataHome(), 'icons', 'hicolor');
  if (!existsSync(hicolor)) return;

  for (const bucket of readdirSync(hicolor)) {
    const icon = join(hicolor, bucket, 'apps', `${ICON_NAME}.png`);
    if (existsSync(icon)) unlinkSync(icon);
  }
}

export function removeDesktopEntry(): void {
  const entry = desktopEntryPath();
  if (existsSync(entry)) unlinkSync(entry);
  removeIcons();
  refreshDesktopDatabase();
}
