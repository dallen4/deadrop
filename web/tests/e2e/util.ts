import {
  TEST_FLAG_COOKIE,
  TEST_TOKEN_COOKIE,
  TEST_TOKEN_HEADER,
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

type BrowserName = PlaywrightWorkerOptions['browserName'];

export type TestOptions = {
  dropBrowser: BrowserName | undefined;
  grabBrowser: BrowserName | undefined;
};

// Unset by default so device projects fall through to their own browser (see
// createPeerPage); only cross-browser projects set an explicit engine.
export const test = base.extend<TestOptions>({
  dropBrowser: [undefined, { option: true }],
  grabBrowser: [undefined, { option: true }],
});

let testToken: string | null = null;

const getTestToken = async () => getRedis().get<string>(testTokenKey);

export const getOrCreateTestToken = async () => {
  if (!testToken)
    testToken = process.env.TEST_TOKEN ?? (await getTestToken());

  return testToken;
};

export const verifyTestToken = async (token: string) => {
  const fetchedToken = await getTestToken();

  return fetchedToken && fetchedToken === token ? true : false;
};

export const createContextForBrowser = async (
  browser: Browser,
  options?: BrowserContextOptions,
) => {
  const context = await browser.newContext({
    ...options,
    bypassCSP: true,
  });

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

  // The `test-tkn` cookie is blocked on cross-site requests to the worker
  // (mirrors the same workaround in tests/e2e/actors/web.ts), so mirror it
  // as an explicit header on every request to the worker's origin rather
  // than trusting the cookie to survive the cross-origin hop.
  const apiOrigin = apiURL.replace(/\/$/, '');

  await context.route(
    (url) => url.href.startsWith(apiOrigin),
    (route) =>
      route.continue({
        headers: {
          ...route.request().headers(),
          [TEST_TOKEN_HEADER]: testToken!,
        },
      }),
  );

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

// Resolves an isolated page for one peer. A set browserType (cross-browser
// projects) launches that engine; otherwise a fresh context in the project's
// own browser is used, so each device project genuinely tests its engine.
export const createPeerPage = async (
  browser: Browser,
  browserTypes: Record<NonNullable<BrowserName>, BrowserType>,
  browserType?: BrowserName,
) => {
  if (browserType) return createPageForBrowser(browserTypes[browserType]);

  const context = await createContextForBrowser(browser);

  return context.newPage();
};
