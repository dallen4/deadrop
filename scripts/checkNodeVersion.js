const { satisfies: isValidVersion } = require('semver');
const { engines } = require('../package.json');

const neededVersion = engines.node;
const currVersion = process.versions.node;

if (!isValidVersion(currVersion, neededVersion)) {
    console.error(
        `You are running Node.js ${currentNodeVersion}.\n` +
            `Your current Node.js version is not compatible with this package.\n` +
            `This package requires the native global fetch introduced in v18.0.0.\n` +
            `Please install Node.js ${neededVersion} or a compatible version.`,
    );
    process.exit(1);
}
