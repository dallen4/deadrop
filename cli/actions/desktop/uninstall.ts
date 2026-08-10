import {
  getInstalledDesktopVersion,
  uninstallDesktop,
} from 'lib/update/desktop';
import { logError, logInfo } from 'lib/log';

const SUPPORTED_PLATFORMS = ['darwin', 'win32', 'linux'];

export async function desktopUninstall() {
  if (!SUPPORTED_PLATFORMS.includes(process.platform)) {
    logError(`deadrop desktop is not supported on ${process.platform}.`);
    return process.exit(1);
  }

  const installedVersion = getInstalledDesktopVersion();

  let result;
  try {
    result = uninstallDesktop();
  } catch (err) {
    logError(`Uninstall failed: ${(err as Error).message}`);
    return process.exit(1);
  }

  if (result.note) {
    logInfo(result.note);
    return process.exit(0);
  }

  // Nothing removed and nothing detected: say so rather than implying we
  // cleaned something up.
  if (!result.removed.length) {
    logInfo('deadrop desktop is not installed.');
    return process.exit(0);
  }

  logInfo(
    `deadrop desktop${installedVersion ? ` v${installedVersion}` : ''} uninstalled:\n${result.removed
      .map((path) => `  ${path}`)
      .join('\n')}`,
  );

  return process.exit(0);
}
