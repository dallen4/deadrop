import 'dotenv/config';
import { randomBytes } from 'crypto';
import { testTokenKey } from '@shared/tests/http';
import { getRedis } from './redis';

// Vitest globalSetup: the returned function is the teardown. Mirrors the drop
// half of web/tests/e2e/global-setup.ts (no Clerk). Seeds a one-hour test
// token into the same Redis the deployed worker reads, so the dropper can
// bypass captcha/rate-limits. Tests read it back from Redis (see util's
// getOrCreateTestToken), so we don't rely on env propagating to workers. TTL
// is just a fallback if teardown doesn't fire.
export default async function setup() {
  const token = randomBytes(32).toString('base64');
  await getRedis().setex(testTokenKey, 60 * 60, token);
  process.env.TEST_TOKEN = token;

  return async () => {
    try {
      await getRedis().del(testTokenKey);
    } catch (err) {
      console.warn(
        'Failed to delete test token from Redis:',
        err instanceof Error ? err.message : err,
      );
    }
  };
}
