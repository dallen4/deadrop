import { spawn } from 'child_process';
import { logInfo, startLoader, stopWithFail, stopWithSuccess } from 'lib/log';
import { fetchLatestNpmVersion, isNewerVersion } from './version';

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

// deadrop only publishes to the npm registry, but users may have
// installed globally via npm, pnpm, yarn, or bun — always shelling out
// to `npm install -g` risks updating a copy that isn't the one on PATH.
// Markers match each PM's real global-install directory convention:
// pnpm -> .../pnpm/global/..., yarn (classic) -> .../.config/yarn/global/...,
// bun -> .../.bun/install/global/...
const PM_MARKERS: Array<[marker: string, pm: PackageManager]> = [
  ['pnpm', 'pnpm'],
  ['yarn', 'yarn'],
  ['.bun', 'bun'],
];

export const detectPackageManager = (
  scriptPath: string = process.argv[1] ?? '',
): PackageManager => {
  const match = PM_MARKERS.find(([marker]) => scriptPath.includes(marker));

  return match ? match[1] : 'npm';
};

export const getGlobalInstallCommand = (
  pm: PackageManager,
): { cmd: string; args: string[] } => {
  switch (pm) {
    case 'pnpm':
      return { cmd: 'pnpm', args: ['add', '-g', 'deadrop@latest'] };
    case 'yarn':
      return { cmd: 'yarn', args: ['global', 'add', 'deadrop@latest'] };
    case 'bun':
      return { cmd: 'bun', args: ['add', '-g', 'deadrop@latest'] };
    default:
      return { cmd: 'npm', args: ['install', '-g', 'deadrop@latest'] };
  }
};

const runGlobalInstall = (pm: PackageManager): Promise<void> =>
  new Promise((resolve, reject) => {
    const { cmd, args } = getGlobalInstallCommand(pm);
    const child = spawn(cmd, args, { stdio: 'ignore' });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(`${cmd} ${args.join(' ')} exited with code ${code}`),
        );
    });
  });

export async function updateNpmInstall(
  currentVersion: string,
): Promise<void> {
  const latest = await fetchLatestNpmVersion();

  if (!isNewerVersion(latest, currentVersion)) {
    logInfo(`Already on the latest version (v${currentVersion})`);
    return;
  }

  const pm = detectPackageManager();

  startLoader(`Updating via ${pm}...`);

  try {
    await runGlobalInstall(pm);
    stopWithSuccess(`v${currentVersion} → v${latest}`);
  } catch (err) {
    stopWithFail(`Update failed: ${(err as Error).message}`);
    throw err;
  }
}
