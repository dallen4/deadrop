import 'dotenv/config';
import { randomBytes } from 'crypto';
import { createClerkClient } from '@clerk/nextjs/server';
import { clerkSetup } from '@clerk/testing/playwright';
import Stripe from 'stripe';
import { getRedis } from 'api/redis';
import { testTokenKey } from '@shared/tests/http';

const REQUIRED_ENV = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_SUPPORTER_LOOKUP_KEY',
  'CLERK_SECRET_KEY',
  // TODO add after webhook is registered
  // 'CLERK_WEBHOOK_SIGNING_SECRET',
] as const;

export default async function globalSetup() {
  const token = randomBytes(32).toString('base64');
  await getRedis().setex(testTokenKey, 60 * 60, token);
  process.env.TEST_TOKEN = token;

  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `Webhook e2e tests require env vars: ${missing.join(', ')}`,
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

  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY!,
  });

  const testEmail = 'clerk_test@deadrop.io';

  // Clean up leftover users from prior runs where teardown didn't fire
  const existing = await clerk.users.getUserList({
    emailAddress: [testEmail],
  });
  for (const user of existing.data) {
    await clerk.users.deleteUser(user.id);
  }

  const testPassword = randomBytes(16).toString('base64url');
  let user;
  try {
    user = await clerk.users.createUser({
      emailAddress: [testEmail],
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
  process.env.CLERK_TEST_EMAIL = testEmail;
  process.env.CLERK_TEST_PASSWORD = testPassword;

  await clerkSetup();
}
