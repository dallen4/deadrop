import 'dotenv/config';
import { test as teardown } from '@playwright/test';
import { createClerkClient } from '@clerk/nextjs/server';
import { getRedis } from 'api/redis';
import { testTokenKey } from '@shared/tests/http';

const TEST_EMAIL = 'clerk_test@deadrop.io';

// Runs as the setup project's `teardown` (a Playwright project). It runs in a
// separate worker, so we cannot rely on process.env set during setup — delete
// the test user by its well-known email instead of a stored id.
teardown('clean up test token + clerk user', async () => {
  try {
    await getRedis().del(testTokenKey);
  } catch (err) {
    console.warn(
      'Failed to delete test token from Redis:',
      err instanceof Error ? err.message : err,
    );
  }

  if (!process.env.RUN_AUTH_TESTS || !process.env.CLERK_SECRET_KEY) {
    return;
  }

  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });
  try {
    const { data } = await clerk.users.getUserList({
      emailAddress: [TEST_EMAIL],
    });
    for (const user of data) {
      await clerk.users.deleteUser(user.id);
    }
  } catch (err) {
    // Don't fail the suite if the user is already gone or unreachable
    console.warn(
      'Failed to delete test user:',
      err instanceof Error ? err.message : err,
    );
  }
});
