
export const DEADROP_URL =
  process.env.DEADROP_APP_URL || 'http://localhost:3000';

export const LOGIN_URL = `${DEADROP_URL}/auth/cli`;

export const LOCALHOST_AUTH_PORT = 1337;

export const LOCALHOST_AUTH_URL = `http://localhost:${LOCALHOST_AUTH_PORT}`;

// `deadrop update` binary-install path — same repo/naming convention as install.sh
export const GITHUB_REPO = 'dallen4/deadrop';
export const BINARY_NAME = 'deadrop';
// The CLI (`deadrop@x.y.z`) and desktop (`deadrop-desktop@x.y.z`) release
// trains share this one releases list — GET /releases/latest doesn't
// distinguish between them, so callers must fetch the list and filter by
// tag prefix instead (see cli/lib/update/version.ts's fetchLatestBinaryVersion
// and cli/lib/update/desktop.ts's fetchLatestDesktopRelease).
// Overridable for mirrors, staging releases, and the Linux sandbox registry.
export const GITHUB_RELEASES_URL =
  process.env.DEADROP_RELEASES_API ||
  `https://api.github.com/repos/${GITHUB_REPO}/releases`;
export const NPM_REGISTRY_LATEST_URL =
  'https://registry.npmjs.org/deadrop/latest';

// mirrors install.sh's `uname -s`/`uname -m` case statements
const RELEASE_PLATFORM_MAP: Partial<Record<NodeJS.Platform, string>> = {
  darwin: 'darwin',
  linux: 'linux',
};

const RELEASE_ARCH_MAP: Record<string, string> = {
  arm64: 'arm64',
  x64: 'x64',
};

export const resolveReleaseAssetName = (
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch,
): string => {
  const os = RELEASE_PLATFORM_MAP[platform];
  const mappedArch = RELEASE_ARCH_MAP[arch];

  if (!os || !mappedArch)
    throw new Error(`Unsupported platform: ${platform}/${arch}`);

  return `${BINARY_NAME}-${os}-${mappedArch}`;
};

export const releaseAssetUrl = (tag: string, assetName: string) =>
  `${
    process.env.DEADROP_RELEASES_DOWNLOAD_BASE ||
    `https://github.com/${GITHUB_REPO}/releases/download`
  }/${tag}/${assetName}`;
