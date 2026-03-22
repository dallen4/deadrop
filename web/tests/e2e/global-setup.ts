import { randomBytes } from 'crypto';
import { getRedis } from 'api/redis';
import { testTokenKey } from '@shared/tests/http';

export default async function globalSetup() {
  const token = randomBytes(32).toString('base64');
  await getRedis().setex(testTokenKey, 60 * 10, token);
  process.env.TEST_TOKEN = token;
}
