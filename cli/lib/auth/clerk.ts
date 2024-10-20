import type { Clerk as ClerkType } from '@clerk/clerk-js';
import { Clerk } from '@clerk/clerk-js/headless';
// import { loadConfig } from './config';

global.window = global.window || {};

const KEY = 'clerk_token';
const tokenCache = new Map();

const clerkFactory = () => {
  let clerkInstance: ClerkType;

  return async () => {
    // const {} = loadConfig();
    const getToken = () => tokenCache.get(KEY);
    const saveToken = (token: string) => tokenCache.set(KEY, token);

    if (clerkInstance) return clerkInstance;

    clerkInstance = new Clerk(process.env.CLERK_PUBLISHABLE_KEY!);

    clerkInstance.__unstable__onBeforeRequest(async (requestInit) => {
      requestInit.credentials = 'omit';

      requestInit.url?.searchParams.append('_is_native', '1');

      (requestInit.headers as Headers).set(
        'authorization',
        getToken() || '',
      );
    });

    clerkInstance.__unstable__onAfterResponse(async (_, response) => {
      const authHeader = response?.headers.get('authorization');

      if (authHeader) saveToken(authHeader);
    });

    await clerkInstance.load({ standardBrowser: false });
    return clerkInstance;
  };
};

export const createClerkClient = clerkFactory();
