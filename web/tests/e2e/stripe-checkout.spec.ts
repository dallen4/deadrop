import { expect, test, type Page } from '@playwright/test';
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright';
import { CHECKOUT_SECRET_KEY } from '../../config/cookies';
import { PRICING_PATH } from '@shared/config/paths';

const CHECKOUT_API_PATH = '/api/stripe/checkout';

const isCheckoutPost = (url: string, method: string) =>
  url.includes(CHECKOUT_API_PATH) && method === 'POST';

// Until Clerk finishes hydrating, useUser() reports no user, so the
// pricing CTA renders wrapped in a SignInButton with the *same* label.
// Clicking it then opens the sign-in modal instead of checkout and the
// API call never fires. Wait for the signed-in client before interacting.
const waitForSignedIn = (page: Page) =>
  page.waitForFunction(
    () => {
      const c = (window as unknown as { Clerk?: { loaded?: boolean; user?: unknown } }).Clerk;
      return !!(c && c.loaded && c.user);
    },
    undefined,
    { timeout: 15_000 },
  );

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
      emailAddress: process.env.CLERK_TEST_EMAIL!,
    });
    await waitForSignedIn(page);

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
      emailAddress: process.env.CLERK_TEST_EMAIL!,
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
    await waitForSignedIn(page);

    // First open
    const supporterCta = page.getByRole('button', {
      name: /become a supporter/i,
    });
    await supporterCta.first().click();
    await page.waitForResponse(
      (res) => isCheckoutPost(res.url(), res.request().method()),
    );

    expect(postCount).toBe(1);

    // Cache write happens after the response resolves (await res.json()),
    // so wait for it rather than reading immediately.
    await page.waitForFunction(
      (key) => !!sessionStorage.getItem(key),
      CHECKOUT_SECRET_KEY,
    );

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
    await waitForSignedIn(page);
    await page
      .getByRole('button', { name: /become a supporter/i })
      .first()
      .click();
    await page.waitForResponse(
      (res) => isCheckoutPost(res.url(), res.request().method()),
    );
    expect(postCount).toBe(1);

    // Ensure the secret is cached before reloading; otherwise the reload
    // races the sessionStorage write and the cache would be lost.
    await page.waitForFunction(
      (key) => !!sessionStorage.getItem(key),
      CHECKOUT_SECRET_KEY,
    );

    await page.reload();
    await waitForSignedIn(page);
    await page
      .getByRole('button', { name: /become a supporter/i })
      .first()
      .click();

    await page.waitForTimeout(1500);
    expect(postCount).toBe(1);
  });
});
