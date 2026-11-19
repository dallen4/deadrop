import { testTokenKey } from './http';
import { getKeyValue } from '../lib/kv';

// Rotated daily by hydrate-test-token.ts; read live rather than seeded per run.
let cachedToken: string | null = null;

const hasKvCredentials = () =>
  !!process.env.CLOUDFLARE_ACCOUNT_ID &&
  !!process.env.CLOUDFLARE_API_TOKEN &&
  !!process.env.CLOUDFLARE_KV_NAMESPACE_ID;

export const getTestToken = async (): Promise<string> => {
  if (cachedToken) return cachedToken;

  if (hasKvCredentials()) {
    const fromKv = await getKeyValue(testTokenKey);

    if (typeof fromKv === 'string' && fromKv)
      return (cachedToken = fromKv);
  }

  const fromEnv = process.env.DROP_TEST_TOKEN;

  if (!fromEnv)
    throw new Error(
      'No test token: set CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN + ' +
        'CLOUDFLARE_KV_NAMESPACE_ID (CI/deployed) or DROP_TEST_TOKEN for local runs.',
    );

  return (cachedToken = fromEnv);
};

// Reachable from web/pages/api/captcha.ts, so a missing token must deny, not throw.
export const verifyTestToken = async (token: string) => {
  if (!token) return false;

  try {
    const fetchedToken = await getTestToken();

    return !!fetchedToken && fetchedToken === token;
  } catch {
    return false;
  }
};
