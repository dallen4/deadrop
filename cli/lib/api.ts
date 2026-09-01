import { createClient, DeadropApiClient } from '@shared/client';
import { createClerkClient } from './auth/clerk';
import { logInfo } from './log';

const deadropFactory = () => {
  let deadropInstance: DeadropApiClient;

  return async (requireAuth?: boolean) => {
    // Gate before the cached instance is handed back — an earlier
    // anonymous caller would otherwise warm it and skip this entirely.
    const clerkClient = await createClerkClient();

    if (requireAuth && !clerkClient.session) {
      logInfo(
        `You're not signed in right now!\nRun \`deadrop login\` to get started.`,
      );

      return process.exit(1);
    }

    if (deadropInstance) return deadropInstance;

    const sessionToken = await clerkClient.session?.getToken();

    const headers: Record<string, string> = {};

    if (sessionToken)
      headers['Authorization'] = `Bearer ${sessionToken}`;

    deadropInstance = createClient(process.env.DEADROP_API_URL!, {
      headers,
    });

    return deadropInstance;
  };
};

export const createDeadropClient = deadropFactory();
