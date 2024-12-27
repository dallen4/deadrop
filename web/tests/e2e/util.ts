import { DISABLE_CAPTCHA_COOKIE } from '@config/cookies';
import {
  Browser,
  BrowserType,
  PlaywrightWorkerOptions,
  test as base,
} from '@playwright/test';
import { baseURL } from './config';

type BrowserName = PlaywrightWorkerOptions['browserName'];

export type TestOptions = {
  dropBrowser: BrowserName;
  grabBrowser: BrowserName;
};

export const test = base.extend<TestOptions>({
  dropBrowser: ['chromium', { option: true }],
  grabBrowser: ['chromium', { option: true }],
});

export const createContextForBrowser = async (browser: Browser) => {
  const context = await browser.newContext();

  await context.addCookies([
    {
      name: DISABLE_CAPTCHA_COOKIE,
      value: 'true',
      sameSite: 'None',
      url: baseURL,
      httpOnly: true,
    },
  ]);

  return context;
};

export const createPageForBrowser = async (browser: BrowserType) => {
  const newBrowser = await browser.launch();
  const context = await createContextForBrowser(newBrowser);

  return context.newPage();
};
