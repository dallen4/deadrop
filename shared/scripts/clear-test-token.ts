import { deleteKeyValue } from '../lib/kv';
import { testTokenKey } from '../tests/http';

(async () => {
  console.log('Clearing test token for captcha bypass...');

  try {
    await deleteKeyValue(testTokenKey);

    console.log('Test token deleted successfully!');
  } catch (err) {
    console.error(err);
  }

  process.exit(0);
})();
