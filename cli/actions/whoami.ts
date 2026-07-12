import { createClerkClient } from 'lib/auth/clerk';
import { logInfo } from 'lib/log';

export default async function whoami() {
  const clerkClient = await createClerkClient();

  if (!clerkClient.session) {
    logInfo(
      `You're not signed in.\nRun \`deadrop login\` to get started.`,
    );

    return process.exit(0);
  }

  logInfo(
    `Signed in as ${clerkClient.session.user.emailAddresses[0]}`,
  );

  process.exit(0);
}
