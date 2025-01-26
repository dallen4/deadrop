import { getRedis } from 'api/redis';
import { testTokenKey } from '@shared/tests/http';

(async () => {
  console.log('Clearing test token for captcha bypass...');

  try {
    const client = getRedis();

    await client.del(testTokenKey);

    console.log('Test token deleted successfully!');
  } catch (err) {
    console.error(err);
  }

  process.exit(0);
})();
