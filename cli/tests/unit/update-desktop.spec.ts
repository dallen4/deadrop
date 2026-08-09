import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchLatestDesktopRelease,
  parseMountPoint,
} from 'lib/update/desktop';

const withPlatform = (platform: string) => {
  vi.stubGlobal('process', { ...process, platform });
};

describe('parseMountPoint', () => {
  it('extracts the /Volumes path from hdiutil attach output', () => {
    const output = `/dev/disk4          \tGUID_partition_scheme
/dev/disk4s1        \tApple_APFS
/dev/disk5          \tApple_APFS                     \t/Volumes/deadrop`;

    expect(parseMountPoint(output)).toBe('/Volumes/deadrop');
  });

  it('throws when no /Volumes path is present', () => {
    expect(() => parseMountPoint('/dev/disk4  GUID_partition_scheme')).toThrow(
      /Could not determine hdiutil mount point/,
    );
  });
});

describe('fetchLatestDesktopRelease', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const stubReleases = (assets: Array<{ name: string; browser_download_url: string }>) =>
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { tag_name: 'deadrop@2.0.0', assets: [] },
          { tag_name: 'deadrop-desktop@1.2.0', assets },
        ],
      }),
    );

  it('resolves the macOS .dmg asset', async () => {
    withPlatform('darwin');
    stubReleases([
      {
        name: 'deadrop_1.2.0_universal.dmg',
        browser_download_url: 'https://example.com/deadrop.dmg',
      },
      {
        name: 'deadrop_1.2.0_universal.dmg.sha256',
        browser_download_url: 'https://example.com/deadrop.dmg.sha256',
      },
    ]);

    await expect(fetchLatestDesktopRelease()).resolves.toEqual({
      version: '1.2.0',
      assetUrl: 'https://example.com/deadrop.dmg',
      assetSha256Url: 'https://example.com/deadrop.dmg.sha256',
    });
  });

  it('resolves the Windows NSIS -setup.exe asset, not the .msi', async () => {
    withPlatform('win32');
    stubReleases([
      {
        name: 'deadrop_1.2.0_x64-setup.exe',
        browser_download_url: 'https://example.com/deadrop-setup.exe',
      },
      {
        name: 'deadrop_1.2.0_x64-setup.exe.sha256',
        browser_download_url: 'https://example.com/deadrop-setup.exe.sha256',
      },
      {
        name: 'deadrop_1.2.0_x64_en-US.msi',
        browser_download_url: 'https://example.com/deadrop.msi',
      },
    ]);

    await expect(fetchLatestDesktopRelease()).resolves.toEqual({
      version: '1.2.0',
      assetUrl: 'https://example.com/deadrop-setup.exe',
      assetSha256Url: 'https://example.com/deadrop-setup.exe.sha256',
    });
  });

  it('resolves the Linux .AppImage asset', async () => {
    withPlatform('linux');
    stubReleases([
      {
        name: 'deadrop_1.2.0_amd64.AppImage',
        browser_download_url: 'https://example.com/deadrop.AppImage',
      },
      {
        name: 'deadrop_1.2.0_amd64.AppImage.sha256',
        browser_download_url: 'https://example.com/deadrop.AppImage.sha256',
      },
    ]);

    await expect(fetchLatestDesktopRelease()).resolves.toEqual({
      version: '1.2.0',
      assetUrl: 'https://example.com/deadrop.AppImage',
      assetSha256Url: 'https://example.com/deadrop.AppImage.sha256',
    });
  });

  it('returns null on an unsupported platform', async () => {
    withPlatform('freebsd');
    stubReleases([]);

    await expect(fetchLatestDesktopRelease()).resolves.toBeNull();
  });

  it('returns null when no desktop release exists', async () => {
    withPlatform('darwin');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ tag_name: 'deadrop@2.0.0', assets: [] }],
      }),
    );

    await expect(fetchLatestDesktopRelease()).resolves.toBeNull();
  });

  it("returns null when the release has no matching asset for this platform", async () => {
    withPlatform('darwin');
    stubReleases([]);

    await expect(fetchLatestDesktopRelease()).resolves.toBeNull();
  });

  it('throws when the GitHub releases API request fails', async () => {
    withPlatform('darwin');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error',
      }),
    );

    await expect(fetchLatestDesktopRelease()).rejects.toThrow(/500/);
  });
});
