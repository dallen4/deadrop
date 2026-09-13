import 'dotenv/config';
import { testTokenKey } from '../tests/http';
import { randomBytes } from 'crypto';
import { setKeyValue } from '../lib/kv';

async function main() {
  console.log('Hydrating test token...');

  const token = randomBytes(32).toString('base64');
  await setKeyValue(testTokenKey, token);
  process.env.TEST_TOKEN = token;

  console.log('Test token hydrated successfully.');
}

main().catch(console.error);
