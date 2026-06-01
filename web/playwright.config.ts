import { PlaywrightTestConfig, devices } from '@playwright/test';
import path from 'path';
import { baseURL, isLocal } from './tests/e2e/config';

const server: PlaywrightTestConfig['webServer'] = {
  command: 'pnpm start',
  url: baseURL,
  timeout: 120_000,
  reuseExistingServer: true,
};

type BrowserName = 'chromium' | 'firefox' | 'webkit';

// ref: https://playwright.dev/docs/test-configuration
const config: PlaywrightTestConfig<{
  dropBrowser: BrowserName;
  grabBrowser: BrowserName;
}> = {
  timeout: 30_000,
  testDir: path.join(__dirname, 'tests', 'e2e'),
  // Auth-dependent specs need a stable custom domain for Clerk, so they
  // only run on alpha/main (RUN_AUTH_TESTS set by CI). Everywhere else
  // they're ignored — the preview *.vercel.app domain breaks Clerk.
  testIgnore: process.env.RUN_AUTH_TESTS
    ? []
    : ['**/stripe-*.spec.ts', '**/clerk-*.spec.ts'],
  retries: 2,
  outputDir: 'test-results/',
  expect: {},
  webServer: isLocal ? server : undefined,
  workers: 3,
  use: {
    baseURL,
    trace: 'retry-with-trace',
    screenshot: 'only-on-failure',
    bypassCSP: true,
  },
  projects: [
    /* Signs in once and saves the Clerk session; cleanup deletes it. */
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
      teardown: 'cleanup',
    },
    {
      name: 'cleanup',
      testMatch: /global-teardown\.ts/,
    },
    /* Test against desktop browsers */
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
    },
    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
      dependencies: ['setup'],
    },
    {
      name: 'Chrome to Firefox',
      use: {
        dropBrowser: 'chromium',
        grabBrowser: 'firefox',
      },
      dependencies: ['setup'],
    },
    {
      name: 'Firefox to Chrome',
      use: {
        dropBrowser: 'firefox',
        grabBrowser: 'chromium',
      },
      dependencies: ['setup'],
    },
    // WebKit cross-browser projects disabled due to Playwright
    // limitation: WebRTC ICE negotiation fails when WebKit runs
    // in a separate process from the other browser.
    // Standalone webkit + Mobile Safari projects still cover
    // WebKit end-to-end. See: https://github.com/microsoft/playwright/issues/2973
  ],
};
export default config;
