import { mkdtempSync, readFileSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  desktopEntryPath,
  installDesktopEntry,
  removeDesktopEntry,
} from 'lib/update/desktop-entry';

describe('desktop entry', () => {
  let dataHome: string;
  const original = process.env.XDG_DATA_HOME;

  beforeEach(() => {
    dataHome = mkdtempSync(join(tmpdir(), 'deadrop-xdg-'));
    process.env.XDG_DATA_HOME = dataHome;
  });

  afterEach(() => {
    rmSync(dataHome, { recursive: true, force: true });
    if (original === undefined) delete process.env.XDG_DATA_HOME;
    else process.env.XDG_DATA_HOME = original;
  });

  const read = () => readFileSync(desktopEntryPath(), 'utf-8');

  it('honors XDG_DATA_HOME', () => {
    expect(desktopEntryPath()).toBe(
      join(dataHome, 'applications', 'deadrop.desktop'),
    );
  });

  it('writes an entry even when icon extraction fails', () => {
    // Not a real AppImage, so --appimage-extract can't succeed — the entry
    // must still be written, since a missing icon beats a missing launcher.
    const appImage = join(dataHome, 'deadrop-desktop.AppImage');
    installDesktopEntry(appImage);

    const entry = read();
    expect(entry).toContain('[Desktop Entry]');
    expect(entry).toContain('Type=Application');
    expect(entry).toContain(`Exec=${appImage}`);
    // Falls back to pointing Icon at the AppImage itself.
    expect(entry).toContain(`Icon=${appImage}`);
  });

  it('uses an absolute Exec path', () => {
    const appImage = join(dataHome, 'deadrop-desktop.AppImage');
    installDesktopEntry(appImage);

    const exec = read()
      .split('\n')
      .find((line) => line.startsWith('Exec='))!
      .slice('Exec='.length);

    expect(exec.startsWith('/')).toBe(true);
  });

  it('declares exactly one main category', () => {
    installDesktopEntry(join(dataHome, 'deadrop-desktop.AppImage'));

    const categories = read()
      .split('\n')
      .find((line) => line.startsWith('Categories='))!
      .slice('Categories='.length)
      .split(';')
      .filter(Boolean);

    const main = [
      'AudioVideo', 'Audio', 'Video', 'Development', 'Education',
      'Game', 'Graphics', 'Network', 'Office', 'Science',
      'Settings', 'System', 'Utility',
    ];

    expect(categories.filter((c) => main.includes(c))).toHaveLength(1);
  });

  it('is idempotent and removable', () => {
    const appImage = join(dataHome, 'deadrop-desktop.AppImage');
    installDesktopEntry(appImage);
    installDesktopEntry(appImage);
    expect(existsSync(desktopEntryPath())).toBe(true);

    removeDesktopEntry();
    expect(existsSync(desktopEntryPath())).toBe(false);
  });
});
