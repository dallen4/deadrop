import { PlaywrightTestConfig, devices } from '@playwright/test';
import path from 'path';
import { baseURL, isLocal, runAuthTests } from './tests/e2e/config';

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
  // Auth-dependent specs only run when runAuthTests (alpha/main, and not
  // hard-disabled via SKIP_AUTH_TESTS). Everywhere else they're ignored so
  // the drop-flow suite runs Clerk-free
  testIgnore: runAuthTests
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
      // multidrop only needs its 3 distinct pairings; skip the redundant copy here
      testIgnore: '**/multidrop.spec.ts',
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
      // Playwright's WebKit lacks working WebRTC, so P2P specs can't run here
      testIgnore: ['**/multidrop.spec.ts', '**/drop-flow.spec.ts'],
    },
    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
      testIgnore: '**/multidrop.spec.ts',
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
      dependencies: ['setup'],
      // WebKit engine: no working WebRTC, same as the webkit project
      testIgnore: ['**/multidrop.spec.ts', '**/drop-flow.spec.ts'],
    },
    {
      name: 'Chrome to Firefox',
      use: {
        dropBrowser: 'chromium',
        grabBrowser: 'firefox',
      },
      dependencies: ['setup'],
      // cross-browser projects only vary the P2P specs; other specs would just re-run chromium
      testMatch: ['**/drop-flow.spec.ts', '**/multidrop.spec.ts'],
    },
    {
      name: 'Firefox to Chrome',
      use: {
        dropBrowser: 'firefox',
        grabBrowser: 'chromium',
      },
      dependencies: ['setup'],
      testMatch: ['**/drop-flow.spec.ts', '**/multidrop.spec.ts'],
    },
    // WebKit cross-browser projects disabled due to Playwright
    // limitation: WebRTC ICE negotiation fails when WebKit runs
    // in a separate process from the other browser.
    // Standalone webkit + Mobile Safari projects still cover
    // WebKit end-to-end. See: https://github.com/microsoft/playwright/issues/2973
  ],
};
export default config;
