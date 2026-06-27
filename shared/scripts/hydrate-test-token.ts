import 'dotenv/config';
import { getRedis } from '../lib/redis';
import { testTokenKey } from '../tests/http';
import { randomBytes } from 'crypto';

async function main() {
  console.log('Hydrating test token...');

  const token = randomBytes(32).toString('base64');
  await getRedis().set(testTokenKey, token);
  process.env.TEST_TOKEN = token;

  console.log('Test token hydrated successfully.');
}

main().catch(console.error);
