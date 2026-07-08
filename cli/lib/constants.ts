
export const DEADROP_URL =
  process.env.DEADROP_APP_URL || 'http://localhost:3000';

export const LOGIN_URL = `${DEADROP_URL}/auth/cli`;

export const LOCALHOST_AUTH_PORT = 1337;

export const LOCALHOST_AUTH_URL = `http://localhost:${LOCALHOST_AUTH_PORT}`;

// `deadrop update` binary-install path — same repo/naming convention as install.sh
export const GITHUB_REPO = 'dallen4/deadrop';
export const BINARY_NAME = 'deadrop';
export const GITHUB_LATEST_RELEASE_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
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
  `https://github.com/${GITHUB_REPO}/releases/download/${tag}/${assetName}`;
