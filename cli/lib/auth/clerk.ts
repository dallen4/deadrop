import type { Clerk as ClerkType } from '@clerk/clerk-js';
import { Clerk } from '@clerk/clerk-js/headless';
import { getToken, setSession } from './cache';

global.window = global.window || {};

const clerkFactory = () => {
  let clerkInstance: ClerkType;

  return async () => {
    if (clerkInstance) return clerkInstance;

    clerkInstance = new Clerk(process.env.CLERK_PUBLISHABLE_KEY!);

    clerkInstance.__unstable__onBeforeRequest(async (requestInit) => {
      requestInit.credentials = 'omit';

      requestInit.url?.searchParams.append('_is_native', '1');

      const token = await getToken();

      (requestInit.headers as Headers).set('authorization', token);
    });

    clerkInstance.__unstable__onAfterResponse(async (_, response) => {
      const authHeader = response?.headers.get('authorization');

      if (authHeader) await setSession(authHeader);
    });

    await clerkInstance.load({ standardBrowser: false });

    return clerkInstance;
  };
};

export const createClerkClient = clerkFactory();
