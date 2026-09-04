import { afterEach, describe, expect, it, vi } from 'vitest';

const homedir = vi.fn();

vi.mock('os', () => ({ homedir }));

const withPlatform = (platform: NodeJS.Platform) =>
  Object.defineProperty(process, 'platform', {
    value: platform,
    configurable: true,
  });

const realPlatform = process.platform;

describe('globalConfigDir', () => {
  afterEach(() => {
    withPlatform(realPlatform);
    delete process.env.APPDATA;
    delete process.env.XDG_DATA_HOME;
    vi.clearAllMocks();
  });

  // The identifier has to match desktop's tauri.conf.json, or the CLI and
  // the app silently keep separate global vaults.
  it('uses Application Support on macOS', async () => {
    const { globalConfigDir } = await import('lib/global-config');

    homedir.mockReturnValue('/Users/ada');
    withPlatform('darwin');

    expect(globalConfigDir()).toBe(
      '/Users/ada/Library/Application Support/com.deadrop',
    );
  });

  it('uses APPDATA on Windows', async () => {
    const { globalConfigDir } = await import('lib/global-config');

    homedir.mockReturnValue('C:\\Users\\ada');
    withPlatform('win32');
    process.env.APPDATA = 'C:\\Users\\ada\\AppData\\Roaming';

    expect(globalConfigDir()).toContain('com.deadrop');
    expect(globalConfigDir()).toContain('Roaming');
  });

  it('falls back to AppData/Roaming when APPDATA is unset', async () => {
    const { globalConfigDir } = await import('lib/global-config');

    homedir.mockReturnValue('C:\\Users\\ada');
    withPlatform('win32');

    expect(globalConfigDir()).toContain('AppData');
    expect(globalConfigDir()).toContain('Roaming');
  });

  it('honors XDG_DATA_HOME on Linux', async () => {
    const { globalConfigDir } = await import('lib/global-config');

    homedir.mockReturnValue('/home/ada');
    withPlatform('linux');
    process.env.XDG_DATA_HOME = '/home/ada/.xdg';

    expect(globalConfigDir()).toBe('/home/ada/.xdg/com.deadrop');
  });

  it('falls back to ~/.local/share on Linux', async () => {
    const { globalConfigDir } = await import('lib/global-config');

    homedir.mockReturnValue('/home/ada');
    withPlatform('linux');

    expect(globalConfigDir()).toBe(
      '/home/ada/.local/share/com.deadrop',
    );
  });
});

describe('globalConfigPath', () => {
  afterEach(() => withPlatform(realPlatform));

  it('appends the config filename to the dir', async () => {
    const { globalConfigPath } = await import('lib/global-config');

    homedir.mockReturnValue('/Users/ada');
    withPlatform('darwin');

    expect(globalConfigPath()).toBe(
      '/Users/ada/Library/Application Support/com.deadrop/.deadroprc',
    );
  });
});
