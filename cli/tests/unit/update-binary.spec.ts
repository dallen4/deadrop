import { describe, expect, it } from 'vitest';
import {
  releaseAssetUrl,
  resolveReleaseAssetName,
} from 'lib/constants';
import { formatProgressBar } from 'lib/update/download';

describe('resolveReleaseAssetName', () => {
  it('builds the darwin arm64 asset name', () => {
    expect(resolveReleaseAssetName('darwin', 'arm64')).toBe(
      'deadrop-darwin-arm64',
    );
  });

  it('builds the darwin x64 asset name', () => {
    expect(resolveReleaseAssetName('darwin', 'x64')).toBe(
      'deadrop-darwin-x64',
    );
  });

  it('builds the linux arm64 asset name', () => {
    expect(resolveReleaseAssetName('linux', 'arm64')).toBe(
      'deadrop-linux-arm64',
    );
  });

  it('builds the linux x64 asset name', () => {
    expect(resolveReleaseAssetName('linux', 'x64')).toBe(
      'deadrop-linux-x64',
    );
  });

  it('throws for an unsupported platform', () => {
    expect(() => resolveReleaseAssetName('win32', 'x64')).toThrow(
      /Unsupported platform/,
    );
  });

  it('throws for an unsupported architecture', () => {
    expect(() => resolveReleaseAssetName('darwin', 'ia32')).toThrow(
      /Unsupported platform/,
    );
  });
});

describe('releaseAssetUrl', () => {
  it('builds the GitHub release download URL', () => {
    expect(releaseAssetUrl('deadrop@1.2.3', 'deadrop-darwin-arm64')).toBe(
      'https://github.com/dallen4/deadrop/releases/download/deadrop@1.2.3/deadrop-darwin-arm64',
    );
  });
});

describe('formatProgressBar', () => {
  it('renders a filled bar at 100%', () => {
    const bar = formatProgressBar(100, 100, 10);

    expect(bar).toContain('100%');
    expect(bar).toContain('##########');
  });

  it('renders a partial bar and byte counts', () => {
    const bar = formatProgressBar(500_000, 1_000_000, 10);

    expect(bar).toContain('50%');
    expect(bar).toContain('0.5/1.0 MB');
  });

  it('falls back to a byte counter when total is unknown', () => {
    const bar = formatProgressBar(2_000_000, 0);

    expect(bar).toBe('Downloading... 2.0 MB');
  });
});
