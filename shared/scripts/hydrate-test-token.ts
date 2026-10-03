import 'dotenv/config';
import { testTokenKey } from '../tests/http';
import { randomBytes } from 'crypto';
import { setKeyValue } from '../lib/kv';
import { getRedis } from '../lib/redis';

// Prod and alpha workers bind separate namespaces; both must hold the same token.
const namespaces = [
  'CLOUDFLARE_KV_NAMESPACE_ID',
  'CLOUDFLARE_ALPHA_KV_NAMESPACE_ID',
].map((name) => {
  const id = process.env[name];

  if (!id) throw new Error(`Missing env: ${name}`);

  return id;
});

// Transitional: both stores must agree while the deployed worker still reads Redis.
async function main() {
  console.log('Hydrating test token...');

  const token = randomBytes(32).toString('base64');

  await Promise.all([
    ...namespaces.map((id) => setKeyValue(testTokenKey, token, id)),
    getRedis().set(testTokenKey, token),
  ]);

  process.env.TEST_TOKEN = token;

  console.log(
    `Test token hydrated to ${namespaces.length} KV namespaces and Redis.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
