import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchLatestBinaryVersion,
  fetchLatestNpmVersion,
  isNewerVersion,
  parseGithubReleaseTag,
} from 'lib/update/version';

describe('parseGithubReleaseTag', () => {
  it('strips the deadrop@ prefix from a release tag', () => {
    expect(parseGithubReleaseTag('deadrop@1.2.3')).toBe('1.2.3');
  });

  it('leaves an already-bare version untouched', () => {
    expect(parseGithubReleaseTag('1.2.3')).toBe('1.2.3');
  });
});

describe('isNewerVersion', () => {
  it('is true when latest is greater than current', () => {
    expect(isNewerVersion('1.1.0', '1.0.0')).toBe(true);
  });

  it('is false when latest equals current', () => {
    expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false);
  });

  it('is false when latest is older than current', () => {
    expect(isNewerVersion('0.9.0', '1.0.0')).toBe(false);
  });
});

describe('fetchLatestBinaryVersion / fetchLatestNpmVersion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves the bare version from the GitHub releases API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ tag_name: 'deadrop@2.0.0' }),
      }),
    );

    await expect(fetchLatestBinaryVersion()).resolves.toBe('2.0.0');
  });

  it('throws when the GitHub releases API request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      }),
    );

    await expect(fetchLatestBinaryVersion()).rejects.toThrow(/404/);
  });

  it('resolves the version from the npm registry', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ version: '3.1.4' }),
      }),
    );

    await expect(fetchLatestNpmVersion()).resolves.toBe('3.1.4');
  });
});
