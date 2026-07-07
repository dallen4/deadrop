import { expect, test } from '@playwright/test';
import Stripe from 'stripe';
import { createClerkClient } from '@clerk/nextjs/server';
import { baseURL } from './config';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

const buildEvent = (overrides: { userId: string; plan: string }) => ({
  id: `evt_test_${Date.now()}`,
  object: 'event',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: `cs_test_${Date.now()}`,
      object: 'checkout.session',
      client_reference_id: overrides.userId,
      metadata: { plan: overrides.plan },
    },
  },
});

test.describe('stripe webhook', () => {
  test.beforeEach(async () => {
    // Reset the test user's plan so the assertion is meaningful
    await clerk.users.updateUserMetadata(
      process.env.CLERK_TEST_USER_ID!,
      { publicMetadata: { plan: null } },
    );
  });

  test('checkout.session.completed grants supporter plan', async ({
    request,
  }) => {
    const userId = process.env.CLERK_TEST_USER_ID!;

    const payload = JSON.stringify(
      buildEvent({ userId, plan: 'supporter' }),
    );
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET!,
    });

    const res = await request.post(`${baseURL}api/webhooks/stripe`, {
      data: payload,
      headers: {
        'content-type': 'application/json',
        'stripe-signature': signature,
      },
    });

    if (res.status() !== 200) {
      // eslint-disable-next-line no-console
      console.error(
        'webhook failed:',
        res.status(),
        await res.text(),
      );
    }

    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ received: true });

    const updated = await clerk.users.getUser(userId);
    expect(updated.publicMetadata.plan).toBe('supporter');
  });

  test('rejects requests with invalid signature', async ({
    request,
  }) => {
    const payload = JSON.stringify(
      buildEvent({
        userId: process.env.CLERK_TEST_USER_ID!,
        plan: 'supporter',
      }),
    );

    const res = await request.post(`${baseURL}api/webhooks/stripe`, {
      data: payload,
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 't=0,v1=invalid',
      },
    });

    expect(res.status()).toBe(400);
  });

  test('rejects requests with missing signature', async ({
    request,
  }) => {
    const payload = JSON.stringify(
      buildEvent({
        userId: process.env.CLERK_TEST_USER_ID!,
        plan: 'supporter',
      }),
    );

    const res = await request.post(`${baseURL}api/webhooks/stripe`, {
      data: payload,
      headers: { 'content-type': 'application/json' },
    });

    expect(res.status()).toBe(400);
  });
});
