import { expect, test, type Page } from '@playwright/test';
import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { CHECKOUT_SECRET_KEY } from '../../config/cookies';
import { PRICING_PATH } from '@shared/config/paths';
import { authFile } from './config';

const CHECKOUT_API_PATH = '/api/stripe/checkout';

const isCheckoutPost = (url: string, method: string) =>
  url.includes(CHECKOUT_API_PATH) && method === 'POST';

// storageState logs us in, but clerk-js still calls the Frontend API on every
// page load to verify/refresh that session. From CI (datacenter IPs) those
// calls are bot-challenged unless the testing token is injected — without it
// clerk-js hangs and window.Clerk.user never resolves. So every authenticated
// page must run setupClerkTestingToken before navigating. The token comes from
// clerkSetup() in the setup project (propagated to all workers).
const useAuthSession = () => {
  test.use({ storageState: authFile });
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
  });
};

// Until clerk-js rehydrates window.Clerk.user from the session cookies, the
// pricing CTA renders wrapped in a SignInButton with the *same* label, so a
// too-early click opens the sign-in modal instead of checkout. Wait for the
// hydrated client before interacting.
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
  test.describe('unauthenticated', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('POST returns 401', async ({ request }) => {
      const res = await request.post(CHECKOUT_API_PATH);
      expect(res.status()).toBe(401);
    });
  });

  test.describe('authenticated', () => {
    useAuthSession();

    test('POST returns a clientSecret', async ({ page }) => {
      // Load a page first so clerk-js refreshes the session cookie from the
      // saved state before we hit the API with page.request.
      await page.goto('/');
      await waitForSignedIn(page);

      const res = await page.request.post(CHECKOUT_API_PATH);
      expect(res.status()).toBe(200);
      const { clientSecret } = await res.json();
      expect(clientSecret).toMatch(/^cs_test_/);
    });
  });
});

test.describe('checkout — modal sessionStorage caching', () => {
  useAuthSession();

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
    // Explicit sub-timeout so a missing POST fails here (with a finalized
    // trace + screenshot) instead of getting hard-killed at the 30s test
    // timeout, which truncates the trace.
    await page.waitForResponse(
      (res) => isCheckoutPost(res.url(), res.request().method()),
      { timeout: 15_000 },
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
      { timeout: 15_000 },
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
