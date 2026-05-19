import 'dotenv/config';
import { createClerkClient } from '@clerk/nextjs/server';

export default async function globalTeardown() {
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
}
