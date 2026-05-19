import { expect, test } from '@playwright/test';
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright';
import { CHECKOUT_SECRET_KEY } from '../../config/cookies';
import { PRICING_PATH } from '@shared/config/paths';

const CHECKOUT_API_PATH = '/api/stripe/checkout';

const isCheckoutPost = (url: string, method: string) =>
  url.includes(CHECKOUT_API_PATH) && method === 'POST';

test.describe('checkout — handler', () => {
  test('unauthenticated POST returns 401', async ({ request }) => {
    const res = await request.post(CHECKOUT_API_PATH);
    expect(res.status()).toBe(401);
  });

  test('authenticated POST returns a clientSecret', async ({
    page,
  }) => {
    await setupClerkTestingToken({ page });
    await page.goto('/');
    await clerk.signIn({
      page,
      signInParams: {
        strategy: 'password',
        identifier: process.env.CLERK_TEST_EMAIL!,
        password: process.env.CLERK_TEST_PASSWORD!,
      },
    });

    const res = await page.request.post(CHECKOUT_API_PATH);
    expect(res.status()).toBe(200);
    const { clientSecret } = await res.json();
    expect(clientSecret).toMatch(/^cs_test_/);
  });
});

test.describe('checkout — modal sessionStorage caching', () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto('/');
    await clerk.signIn({
      page,
      signInParams: {
        strategy: 'password',
        identifier: process.env.CLERK_TEST_EMAIL!,
        password: process.env.CLERK_TEST_PASSWORD!,
      },
    });
  });

  test('only calls checkout API once across modal re-opens', async ({
    page,
  }) => {
    let postCount = 0;
    page.on('request', (req) => {
      if (isCheckoutPost(req.url(), req.method())) postCount++;
    });

    await page.goto(PRICING_PATH);

    // First open
    const supporterCta = page.getByRole('button', {
      name: /become a supporter/i,
    });
    await supporterCta.first().click();
    await page.waitForResponse(
      (res) => isCheckoutPost(res.url(), res.request().method()),
    );

    expect(postCount).toBe(1);

    // Cache is populated
    const cached = await page.evaluate(
      (key) => sessionStorage.getItem(key),
      CHECKOUT_SECRET_KEY,
    );
    expect(cached).toBeTruthy();

    // Close + reopen
    await page.keyboard.press('Escape');
    await supporterCta.first().click();

    // Give the modal a moment to mount — if it were going to hit the API again, it would by now
    await page.waitForTimeout(1500);
    expect(postCount).toBe(1);
  });

  test('cache survives a full page reload', async ({ page }) => {
    let postCount = 0;
    page.on('request', (req) => {
      if (isCheckoutPost(req.url(), req.method())) postCount++;
    });

    await page.goto(PRICING_PATH);
    await page
      .getByRole('button', { name: /become a supporter/i })
      .first()
      .click();
    await page.waitForResponse(
      (res) => isCheckoutPost(res.url(), res.request().method()),
    );
    expect(postCount).toBe(1);

    await page.reload();
    await page
      .getByRole('button', { name: /become a supporter/i })
      .first()
      .click();

    await page.waitForTimeout(1500);
    expect(postCount).toBe(1);
  });
});
