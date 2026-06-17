import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { TEST_FLAG_COOKIE, TEST_TOKEN_COOKIE } from '@shared/tests/http';
import { DROP_PATH } from '@shared/config/paths';
import { apiURL, baseURL, grabTimeout, testToken } from '../../utils/config';
import { ActorKind } from './types';
import type { DropActor, GrabActor } from './types';

// Web UI element IDs (mirrored from web/lib/constants.ts — copying avoids a
// cross-workspace import that would require the web tsconfig at runtime).
const BEGIN_DROP_BTN = '#begin-drop-btn';
const CONFIRM_PAYLOAD_BTN = '#confirm-payload-btn';
const DROP_LINK = '#drop-link';
const BEGIN_GRAB_BTN = '#begin-grab-btn';
const DROP_SECRET_VALUE = '#drop-secret-value';

async function newContext(browser: Browser): Promise<BrowserContext> {
  const ctx = await browser.newContext({ bypassCSP: true });
  const token = testToken();
  // Mirror what web/tests/e2e/util.ts does: plant the test token cookie so the
  // worker's captcha-bypass path accepts the drop without a real hCaptcha solve.
  await ctx.addCookies([
    {
      name: TEST_TOKEN_COOKIE,
      value: token,
      sameSite: 'None',
      url: apiURL,
      httpOnly: true,
      secure: true,
    },
    {
      name: TEST_TOKEN_COOKIE,
      value: token,
      sameSite: 'None',
      url: baseURL,
      httpOnly: true,
      secure: true,
    },
    {
      name: TEST_FLAG_COOKIE,
      value: 'true',
      sameSite: 'Strict',
      url: baseURL,
      httpOnly: false,
      secure: true,
    },
  ]);
  return ctx;
}

export const webDropActor = (): DropActor => {
  let browser: Browser | null = null;
  let ctx: BrowserContext | null = null;
  let page: Page | null = null;

  return {
    kind: ActorKind.Web,
    async drop(secret) {
      browser = await chromium.launch();
      ctx = await newContext(browser);
      page = await ctx.newPage();

      await page.goto(`${baseURL.replace(/\/$/, '')}${DROP_PATH}`);
      await page.locator(BEGIN_DROP_BTN).click();
      await page.getByPlaceholder('Your secret').fill(secret);
      await page.locator(CONFIRM_PAYLOAD_BTN).click();

      const link = await page.locator(DROP_LINK).getAttribute('href', {
        timeout: grabTimeout,
      });
      if (!link) throw new Error('Drop link not found after confirm');

      // Extract the drop id from the grab link (?drop=<id>)
      const id = new URL(link, baseURL).searchParams.get('drop');
      if (!id) throw new Error(`Could not parse drop id from link: ${link}`);

      return { id, link };
    },

    async dispose() {
      await page?.close();
      await ctx?.close();
      await browser?.close();
    },
  };
};

export const webGrabActor = (): GrabActor => {
  let browser: Browser | null = null;
  let ctx: BrowserContext | null = null;
  let page: Page | null = null;

  return {
    kind: ActorKind.Web,
    async grab(id) {
      browser = await chromium.launch();
      ctx = await newContext(browser);
      page = await ctx.newPage();

      // Navigate to the grab link directly using the drop id
      await page.goto(`${baseURL.replace(/\/$/, '')}/grab?drop=${id}`);
      await page.locator(BEGIN_GRAB_BTN).click();

      await page.locator(DROP_SECRET_VALUE).waitFor({
        state: 'visible',
        timeout: grabTimeout,
      });

      return page.locator(DROP_SECRET_VALUE).innerHTML();
    },

    async dispose() {
      await page?.close();
      await ctx?.close();
      await browser?.close();
    },
  };
};
