import { GRAB_PATH } from '@shared/config/paths';
import { satisfies as isValidVersion } from 'semver';
import { engines } from '../../package.json';

export const generateGrabUrl = (id: string) => {
    const params = new URLSearchParams({ drop: id });
    const baseUrl = new URL(GRAB_PATH, process.env.DEADDROP_API_URL!);

    return `${baseUrl.toString()}?${params.toString()}`;
};

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
