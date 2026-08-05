import {
  DESKTOP_APP_PATH,
  fetchLatestDesktopRelease,
  getInstalledDesktopVersion,
  installOrUpdateDesktop,
} from 'lib/update/desktop';
import { isNewerVersion } from 'lib/update/version';
import { logError, logInfo } from 'lib/log';

export async function desktopInstall(
  options: { force?: boolean } = {},
) {
  if (process.platform !== 'darwin') {
    logError('deadrop desktop is currently macOS-only.');
    return process.exit(1);
  }

  const release = await fetchLatestDesktopRelease();

  if (!release) {
    logError(
      `No published deadrop desktop release found.\nSee https://github.com/dallen4/deadrop/releases`,
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

  logInfo(
    `deadrop desktop v${release.version} installed to ${DESKTOP_APP_PATH}\n` +
      `Unsigned build — the first launch may show an "unidentified developer" warning; right-click the app and choose Open.`,
  );

  return process.exit(0);
}
