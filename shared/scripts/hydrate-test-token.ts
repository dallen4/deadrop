import 'dotenv/config';
import { testTokenKey } from '../tests/http';
import { randomBytes } from 'crypto';
import { setKeyValue } from '../lib/kv';
import { getRedis } from '../lib/redis';

// Transitional: both stores must agree while the deployed worker still reads Redis.
async function main() {
  console.log('Hydrating test token...');

  const token = randomBytes(32).toString('base64');

  await Promise.all([
    setKeyValue(testTokenKey, token),
    getRedis().set(testTokenKey, token),
  ]);

  process.env.TEST_TOKEN = token;

  console.log('Test token hydrated to Cloudflare KV and Redis.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
