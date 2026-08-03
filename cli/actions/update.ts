import { confirm } from '@inquirer/prompts';
import { version } from '../package.json';
import { logError, logInfo, logWarning } from 'lib/log';
import {
  fetchLatestDesktopRelease,
  getInstalledDesktopVersion,
  installOrUpdateDesktop,
  isNewerVersion,
  updateBinaryInstall,
  updateNpmInstall,
} from 'lib/update';

// Best-effort: deadrop update's primary job (updating the CLI) already
// succeeded by the time this runs, so a failure here is a warning, not a
// reason to exit non-zero.
async function maybeOfferDesktopUpdate() {
  if (process.platform !== 'darwin') return;

  const installedVersion = getInstalledDesktopVersion();
  if (!installedVersion) return;

  try {
    const release = await fetchLatestDesktopRelease();
    if (!release || !isNewerVersion(release.version, installedVersion))
      return;

    const shouldUpdate = await confirm({
      message: `A newer desktop version is available (v${installedVersion} → v${release.version}). Update now?`,
    });
    if (!shouldUpdate) return;

    await installOrUpdateDesktop(release);
    logInfo(`deadrop desktop updated to v${release.version}`);
  } catch (err) {
    logWarning(`Desktop update check failed: ${(err as Error).message}`);
  }
}

export default async function update(
  options: { skipDesktop?: boolean } = {},
) {
  try {
    if (process.env.DEADROP_INSTALL_METHOD === 'binary')
      await updateBinaryInstall(version);
    else await updateNpmInstall(version);

    if (!options.skipDesktop) await maybeOfferDesktopUpdate();

    process.exit(0);
  } catch (err) {
    logError(`Update failed: ${(err as Error).message}`);
    process.exit(1);
  }
}
