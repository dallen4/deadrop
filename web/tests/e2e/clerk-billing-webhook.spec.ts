import { expect, test } from '@playwright/test';
import { Webhook } from 'standardwebhooks';
import { createClerkClient } from '@clerk/nextjs/server';
import { baseURL } from './config';

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

const ENDPOINT = `${baseURL}api/webhooks/clerk-billing`;

function signedHeaders(payload: string) {
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SIGNING_SECRET!);
  const msgId = `msg_test_${Date.now()}`;
  const ts = new Date();
  const sig = wh.sign(msgId, ts, payload);
  return {
    'content-type': 'application/json',
    'webhook-id': msgId,
    'webhook-timestamp': String(Math.floor(ts.getTime() / 1000)),
    'webhook-signature': sig,
  };
}

function buildSubscriptionEvent(
  type: 'subscription.created' | 'subscription.active',
  userId: string,
) {
  const now = Date.now();
  return {
    type,
    data: {
      object: 'commerce_subscription',
      id: `sub_test_${now}`,
      status: type === 'subscription.active' ? 'active' : 'incomplete',
      payer_id: userId,
      payer: {
        object: 'commerce_payer',
        id: `payer_test_${now}`,
        user_id: userId,
        instance_id: 'inst_test',
        email: 'clerk_test@deadrop.io',
        image_url: '',
        created_at: now,
        updated_at: now,
      },
      items: [
        {
          object: 'commerce_subscription_item',
          id: `si_test_${now}`,
          status: 'active',
          plan: {
            id: 'plan_pro',
            instance_id: 'inst_test',
            product_id: 'prod_test',
            name: 'Pro',
            slug: 'pro',
            is_default: false,
            is_recurring: true,
            amount: 1200,
            period: 'month',
            interval: 1,
            has_base_fee: true,
            currency: 'usd',
            annual_monthly_amount: 1000,
            publicly_visible: true,
          },
          plan_id: 'plan_pro',
          plan_period: 'month',
          period_start: now,
          period_end: null,
          lifetime_paid: 0,
          next_payment_amount: 1200,
          next_payment_date: now + 30 * 24 * 60 * 60 * 1000,
          amount: { amount: 1200, currency_symbol: '$', currency_code: 'usd' },
          credit: {
            amount: { amount: 0, currency_symbol: '$', currency_code: 'usd' },
            cycle_days_remaining: 30,
            cycle_days_total: 30,
            cycle_remaining_percent: 100,
          },
          proration_date: new Date(now).toISOString(),
          created_at: now,
          updated_at: now,
        },
      ],
      latest_payment_id: 'pay_test',
      payment_source_id: 'ps_test',
      created_at: now,
      updated_at: now,
    },
  };
}

function buildSubscriptionItemCanceledEvent(userId: string) {
  const now = Date.now();
  return {
    type: 'subscriptionItem.canceled',
    data: {
      object: 'commerce_subscription_item',
      id: `si_test_${now}`,
      status: 'canceled',
      plan: {
        id: 'plan_pro',
        instance_id: 'inst_test',
        product_id: 'prod_test',
        name: 'Pro',
        slug: 'pro',
        is_default: false,
        is_recurring: true,
        amount: 1200,
        period: 'month',
        interval: 1,
        has_base_fee: true,
        currency: 'usd',
        annual_monthly_amount: 1000,
        publicly_visible: true,
      },
      plan_id: 'plan_pro',
      plan_period: 'month',
      period_start: now - 30 * 24 * 60 * 60 * 1000,
      period_end: now,
      canceled_at: now,
      lifetime_paid: 1200,
      next_payment_amount: 0,
      next_payment_date: 0,
      amount: { amount: 1200, currency_symbol: '$', currency_code: 'usd' },
      credit: {
        amount: { amount: 0, currency_symbol: '$', currency_code: 'usd' },
        cycle_days_remaining: 0,
        cycle_days_total: 30,
        cycle_remaining_percent: 0,
      },
      proration_date: new Date(now).toISOString(),
      payer: {
        object: 'commerce_payer',
        id: `payer_test_${now}`,
        user_id: userId,
        instance_id: 'inst_test',
        email: 'clerk_test@deadrop.io',
        image_url: '',
        created_at: now - 30 * 24 * 60 * 60 * 1000,
        updated_at: now,
      },
      created_at: now - 30 * 24 * 60 * 60 * 1000,
      updated_at: now,
    },
  };
}

test.describe('clerk billing webhook', () => {
  test.beforeEach(async () => {
    // The signing secret is issued by Clerk when the billing webhook endpoint
    // is registered for a given instance, and must match the value deployed to
    // that environment. Until it's wired into CI + the deployment, skip rather
    // than fail. Activate by setting CLERK_WEBHOOK_SIGNING_SECRET in both.
    test.skip(
      !process.env.CLERK_WEBHOOK_SIGNING_SECRET,
      'Set CLERK_WEBHOOK_SIGNING_SECRET (CI secret + matching deployed env) to enable',
    );

    await clerk.users.updateUserMetadata(
      process.env.CLERK_TEST_USER_ID!,
      { publicMetadata: { plan: null } },
    );
  });

  test('subscription.created returns 200', async ({ request }) => {
    const payload = JSON.stringify(
      buildSubscriptionEvent(
        'subscription.created',
        process.env.CLERK_TEST_USER_ID!,
      ),
    );

    const res = await request.post(ENDPOINT, {
      data: payload,
      headers: signedHeaders(payload),
    });

    if (res.status() !== 200) {
      console.error(
        'webhook failed:',
        res.status(),
        await res.text(),
      );
    }

    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ received: true });
  });

  test('subscription.active returns 200', async ({ request }) => {
    const payload = JSON.stringify(
      buildSubscriptionEvent(
        'subscription.active',
        process.env.CLERK_TEST_USER_ID!,
      ),
    );

    const res = await request.post(ENDPOINT, {
      data: payload,
      headers: signedHeaders(payload),
    });

    if (res.status() !== 200) {
      console.error(
        'webhook failed:',
        res.status(),
        await res.text(),
      );
    }

    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ received: true });
  });

  test('subscriptionItem.canceled returns 200', async ({ request }) => {
    const payload = JSON.stringify(
      buildSubscriptionItemCanceledEvent(
        process.env.CLERK_TEST_USER_ID!,
      ),
    );

    const res = await request.post(ENDPOINT, {
      data: payload,
      headers: signedHeaders(payload),
    });

    if (res.status() !== 200) {
      console.error(
        'webhook failed:',
        res.status(),
        await res.text(),
      );
    }

    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ received: true });
  });

  test('rejects requests with invalid signature', async ({ request }) => {
    const payload = JSON.stringify(
      buildSubscriptionEvent(
        'subscription.created',
        process.env.CLERK_TEST_USER_ID!,
      ),
    );

    const res = await request.post(ENDPOINT, {
      data: payload,
      headers: {
        'content-type': 'application/json',
        'webhook-id': 'msg_test_invalid',
        'webhook-timestamp': String(
          Math.floor(Date.now() / 1000),
        ),
        'webhook-signature': 'v1,invalidsignature',
      },
    });

    expect(res.status()).toBe(400);
  });

  test('rejects requests with missing signature headers', async ({
    request,
  }) => {
    const payload = JSON.stringify(
      buildSubscriptionEvent(
        'subscription.created',
        process.env.CLERK_TEST_USER_ID!,
      ),
    );

    const res = await request.post(ENDPOINT, {
      data: payload,
      headers: { 'content-type': 'application/json' },
    });

    expect(res.status()).toBe(400);
  });
});
