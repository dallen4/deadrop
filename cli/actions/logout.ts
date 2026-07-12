import { createClerkClient } from 'lib/auth/clerk';
import { clearSession } from 'lib/auth/cache';
import { logInfo } from 'lib/log';

export default async function logout() {
  const clerkClient = await createClerkClient();

  if (!clerkClient.session) {
    logInfo(
      `You're not signed in right now!\nRun \`deadrop login\` to get started.`,
    );

    return process.exit(0);
  }

  await clerkClient.signOut();

  await clearSession();

  logInfo('Successfully signed out!');

  process.exit(0);
}
