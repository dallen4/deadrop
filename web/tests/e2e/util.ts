import {
  TEST_FLAG_COOKIE,
  TEST_TOKEN_COOKIE,
  testTokenKey,
} from '@shared/tests/http';
import {
  Browser,
  BrowserContextOptions,
  BrowserType,
  PlaywrightWorkerOptions,
  test as base,
} from '@playwright/test';
import { apiURL, baseURL, isLocal } from './config';
import { getRedis } from 'api/redis';
import { randomBytes } from 'crypto';

type BrowserName = PlaywrightWorkerOptions['browserName'];

export type TestOptions = {
  dropBrowser: BrowserName;
  grabBrowser: BrowserName;
};

export const test = base.extend<TestOptions>({
  dropBrowser: ['chromium', { option: true }],
  grabBrowser: ['chromium', { option: true }],
});

let testToken: string | null = null;

const getTestToken = async () => getRedis().get<string>(testTokenKey);

export const getOrCreateTestToken = async () => {
  const client = getRedis();

  if (!testToken) testToken = await getTestToken();

  if (!testToken) {
    const token = randomBytes(32).toString('base64');

    await client.setex(testTokenKey, 60 * 10, token);
  }

  return getTestToken();
};

export const verifyTestToken = async (token: string) => {
  const fetchedToken = await getTestToken();

  return fetchedToken && fetchedToken === token ? true : false;
};

export const createContextForBrowser = async (
  browser: Browser,
  options?: BrowserContextOptions,
) => {
  const context = await browser.newContext(options);

  if (!testToken) testToken = await getOrCreateTestToken();

  await context.addCookies([
    {
      name: TEST_TOKEN_COOKIE,
      value: testToken!,
      sameSite: 'None',
      url: apiURL,
      httpOnly: true,
      secure: !isLocal,
    },
    {
      name: TEST_TOKEN_COOKIE,
      value: testToken!,
      sameSite: 'None',
      url: baseURL,
      httpOnly: true,
      secure: !isLocal,
    },
    {
      name: TEST_FLAG_COOKIE,
      value: 'true',
      sameSite: 'Strict',
      url: baseURL,
      httpOnly: false,
      secure: !isLocal,
    },
  ]);

  return context;
};

export const createPageForBrowser = async (
  browser: BrowserType,
  options?: BrowserContextOptions,
) => {
  const newBrowser = await browser.launch();
  const context = await createContextForBrowser(newBrowser, options);

  return context.newPage();
};
