import 'dotenv/config';
import { test as teardown } from '@playwright/test';
import { createClerkClient } from '@clerk/nextjs/server';
import { getRedis } from 'api/redis';
import { testTokenKey } from '@shared/tests/http';

teardown('global teardown', async () => {
  // Remove the seeded test token so it can't outlive the run. The TTL
  // in global-setup is only a fallback in case teardown doesn't fire.
  try {
    await getRedis().del(testTokenKey);
  } catch (err) {
    console.warn(
      'Failed to delete test token from Redis:',
      err instanceof Error ? err.message : err,
    );
  }

  const userId = process.env.CLERK_TEST_USER_ID;
  if (!userId) return;

  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY!,
  });
  try {
    await clerk.users.deleteUser(userId);
  } catch (err) {
    // Don't fail the suite if the user is already gone or unreachable
    console.warn(
      `Failed to delete test user ${userId}:`,
      err instanceof Error ? err.message : err,
    );
  }
});
