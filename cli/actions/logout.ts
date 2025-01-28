import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { createClerkClient } from 'lib/auth/clerk';
import { STORAGE_DIR_NAME } from '@shared/lib/constants';
import { logInfo } from 'lib/log';
import { cwd } from 'process';

export default async function logout() {
  const clerkClient = await createClerkClient();

  if (!clerkClient.session) {
    logInfo(
      `You're not signed in right now!\nRun \`deadrop login\` to get started.`,
    );

    return process.exit(0);
  }

  await clerkClient.signOut();

  const authCachePath = `${cwd()}/${STORAGE_DIR_NAME}/creds`;

  if (existsSync(authCachePath)) await unlink(authCachePath);

  logInfo('Successfully signed out!');

  process.exit(0);
}
