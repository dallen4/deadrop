import { createClient, DeadropApiClient } from '@api/client';
import { createClerkClient } from './auth/clerk';

const deadropFactory = () => {
  let deadropInstance: DeadropApiClient;

  return async () => {
    if (deadropInstance) return deadropInstance;

    const clerkClient = await createClerkClient();

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
