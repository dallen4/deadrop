import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchLatestDesktopRelease,
  parseMountPoint,
} from 'lib/update/desktop';

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

  it('skips CLI releases and resolves the newest desktop tag + assets', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { tag_name: 'deadrop@2.0.0', assets: [] },
          {
            tag_name: 'deadrop-desktop@1.2.0',
            assets: [
              {
                name: 'deadrop_1.2.0_universal.dmg',
                browser_download_url: 'https://example.com/deadrop.dmg',
              },
              {
                name: 'deadrop_1.2.0_universal.dmg.sha256',
                browser_download_url: 'https://example.com/deadrop.dmg.sha256',
              },
            ],
          },
        ],
      }),
    );

    await expect(fetchLatestDesktopRelease()).resolves.toEqual({
      version: '1.2.0',
      dmgUrl: 'https://example.com/deadrop.dmg',
      dmgSha256Url: 'https://example.com/deadrop.dmg.sha256',
    });
  });

  it('returns null when no desktop release exists', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ tag_name: 'deadrop@2.0.0', assets: [] }],
      }),
    );

    await expect(fetchLatestDesktopRelease()).resolves.toBeNull();
  });

  it('returns null when the release has no .dmg asset', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { tag_name: 'deadrop-desktop@1.2.0', assets: [] },
        ],
      }),
    );

    await expect(fetchLatestDesktopRelease()).resolves.toBeNull();
  });

  it('throws when the GitHub releases API request fails', async () => {
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
