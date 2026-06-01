import 'dotenv/config';
import { randomBytes } from 'crypto';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { test as setup } from '@playwright/test';
import {
  clerk,
  clerkSetup,
  setupClerkTestingToken,
} from '@clerk/testing/playwright';
import { createClerkClient } from '@clerk/nextjs/server';
import Stripe from 'stripe';
import { getRedis } from 'api/redis';
import { testTokenKey } from '@shared/tests/http';
import { authFile } from './config';

const REQUIRED_ENV = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_SUPPORTER_LOOKUP_KEY',
  'CLERK_SECRET_KEY',
  // TODO add after webhook is registered
  // 'CLERK_WEBHOOK_SIGNING_SECRET',
] as const;

const TEST_EMAIL = 'clerk_test@deadrop.io';

// Runs as a Playwright setup *project* (not a globalSetup function), per
// Clerk's official guidance: the testing token clerkSetup() obtains is only
// needed here, for the single interactive sign-in below. That sign-in is
// saved to `authFile` via storageState; every auth spec then replays those
// session cookies instead of signing in again. Replaying an existing session
// is not bot-challenged, which is what makes this reliable from CI IPs.
setup.describe.configure({ mode: 'serial' });

setup('seed test token + clerk user', async () => {
  const token = randomBytes(32).toString('base64');
  await getRedis().setex(testTokenKey, 60 * 60, token);
  process.env.TEST_TOKEN = token;

  // Auth specs only run on alpha/main (stable custom domain). Elsewhere the
  // token above is all the drop specs need — skip the Clerk/Stripe setup.
  if (!process.env.RUN_AUTH_TESTS) return;

  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `Auth e2e tests require env vars: ${missing.join(', ')}`,
    );
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const prices = await stripe.prices.search({
    query: `lookup_key:'${process.env.STRIPE_SUPPORTER_LOOKUP_KEY}'`,
  });
  if (prices.data.length === 0) {
    throw new Error(
      `Stripe price not found for lookup_key=${process.env.STRIPE_SUPPORTER_LOOKUP_KEY}`,
    );
  }
  process.env.STRIPE_SUPPORTER_PRICE_ID = prices.data[0].id;

  const clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY!,
  });

  // Clean up leftover users from prior runs where teardown didn't fire
  const existing = await clerkClient.users.getUserList({
    emailAddress: [TEST_EMAIL],
  });
  for (const user of existing.data) {
    await clerkClient.users.deleteUser(user.id);
  }

  const testPassword = randomBytes(16).toString('base64url');
  let user;
  try {
    user = await clerkClient.users.createUser({
      emailAddress: [TEST_EMAIL],
      username: 'clerk_test',
      password: testPassword,
      skipPasswordChecks: true,
    });
  } catch (err: any) {
    console.error(
      '[global-setup] Clerk createUser failed:',
      JSON.stringify(err.errors ?? err, null, 2),
    );
    throw err;
  }
  process.env.CLERK_TEST_USER_ID = user.id;
  process.env.CLERK_TEST_EMAIL = TEST_EMAIL;
  process.env.CLERK_TEST_PASSWORD = testPassword;

  await clerkSetup();
});

setup('authenticate and save session', async ({ page }) => {
  if (!process.env.RUN_AUTH_TESTS) return;

  // The one sign-in that uses the testing token to bypass bot detection.
  await setupClerkTestingToken({ page });
  await page.goto('/');
  await clerk.signIn({ page, emailAddress: TEST_EMAIL });
  await page.waitForFunction(
    () =>
      !!(window as unknown as { Clerk?: { user?: unknown } }).Clerk
        ?.user,
    undefined,
    { timeout: 15_000 },
  );

  mkdirSync(dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
