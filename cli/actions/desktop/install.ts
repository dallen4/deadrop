import {
  fetchLatestDesktopRelease,
  getDesktopInstallLocation,
  getInstalledDesktopVersion,
  installOrUpdateDesktop,
} from 'lib/update/desktop';
import { isNewerVersion } from 'lib/update/version';
import { logError, logInfo } from 'lib/log';

const SUPPORTED_PLATFORMS = ['darwin', 'win32', 'linux'];

export async function desktopInstall(
  options: { force?: boolean } = {},
) {
  if (!SUPPORTED_PLATFORMS.includes(process.platform)) {
    logError(`deadrop desktop is not supported on ${process.platform}.`);
    return process.exit(1);
  }

  const release = await fetchLatestDesktopRelease();

  if (!release) {
    // Also covers "a desktop release exists, but publishes no build for
    // this platform/arch" — naming both beats a bare "not found" when the
    // real answer is that we don't ship for it yet.
    logError(
      `No published deadrop desktop build found for ${process.platform}/${process.arch}.\nSee https://github.com/dallen4/deadrop/releases`,
    );
    return process.exit(1);
  }

  const installedVersion = getInstalledDesktopVersion();

  if (
    installedVersion &&
    !options.force &&
    !isNewerVersion(release.version, installedVersion)
  ) {
    logInfo(`Already on the latest version (v${installedVersion})`);
    return process.exit(0);
  }

  logInfo(
    installedVersion
      ? `Updating deadrop desktop v${installedVersion} → v${release.version}...`
      : `Installing deadrop desktop v${release.version}...`,
  );

  try {
    await installOrUpdateDesktop(release);
  } catch (err) {
    logError(`Install failed: ${(err as Error).message}`);
    return process.exit(1);
  }

  const installLocation = getDesktopInstallLocation();
  const unsignedWarning =
    process.platform === 'darwin'
      ? 'Unsigned build — the first launch may show an "unidentified developer" warning; right-click the app and choose Open.'
      : process.platform === 'win32'
        ? 'Unsigned build — Windows SmartScreen may warn on first launch; choose "More info" → "Run anyway".'
        : 'Unsigned build.';

  logInfo(
    `deadrop desktop v${release.version} installed${installLocation ? ` to ${installLocation}` : ''}\n${unsignedWarning}`,
  );

  return process.exit(0);
}
