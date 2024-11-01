import { satisfies as isValidVersion } from 'semver';
import { engines } from '../../package.json';
import { generateGrabUrl as baseGenerateGrabUrl } from '@shared/lib/util';

export const generateGrabUrl = (id: string) =>
  baseGenerateGrabUrl(process.env.DEADROP_API_URL!, id);

export const checkNodeVersion = () => {
  const neededVersion = engines.node;
  const currVersion = process.versions.node;

  if (!isValidVersion(currVersion, neededVersion)) {
    console.error(
      `You are running Node.js ${currVersion}.\n` +
        `Your current Node.js version is not compatible with this package.\n` +
        `This package requires the native global fetch introduced in v18.0.0.\n` +
        `Please install Node.js ${neededVersion} or a compatible version.`,
    );
    process.exit(1);
  }
};
