import { version } from '../package.json';
import { logError } from 'lib/log';
import { updateBinaryInstall, updateNpmInstall } from 'lib/update';

export default async function update() {
  try {
    if (process.env.DEADROP_INSTALL_METHOD === 'binary')
      await updateBinaryInstall(version);
    else await updateNpmInstall(version);

    process.exit(0);
  } catch (err) {
    logError(`Update failed: ${(err as Error).message}`);
    process.exit(1);
  }
}
