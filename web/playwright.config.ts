import { PlaywrightTestConfig, devices } from '@playwright/test';
import path from 'path';
import { baseURL, isLocal } from './tests/e2e/config';

const server = {
  command: 'yarn run start',
  url: baseURL,
  timeout: 120_000,
};

type BrowserName = 'chromium' | 'firefox' | 'webkit';

// ref: https://playwright.dev/docs/test-configuration
const config: PlaywrightTestConfig<{
  dropBrowser: BrowserName;
  grabBrowser: BrowserName;
}> = {
  globalSetup: path.join(__dirname, 'tests', 'e2e', 'global-setup.ts'),
  timeout: 30_000,
  testDir: path.join(__dirname, 'tests', 'e2e'),
  retries: 2,
  outputDir: 'test-results/',
  expect: {},
  webServer: isLocal ? server : undefined,
  workers: 3,
  use: {
    baseURL,
    trace: 'retry-with-trace',
    bypassCSP: true,
  },
  projects: [
    /* Test against desktop browsers */
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'Chrome to Firefox',
      use: {
        dropBrowser: 'chromium',
        grabBrowser: 'firefox',
      },
    },
    {
      name: 'Firefox to Chrome',
      use: {
        dropBrowser: 'firefox',
        grabBrowser: 'chromium',
      },
    },
    // WebKit cross-browser projects disabled due to Playwright
    // limitation: WebRTC ICE negotiation fails when WebKit runs
    // in a separate process from the other browser.
    // Standalone webkit + Mobile Safari projects still cover
    // WebKit end-to-end. See: https://github.com/microsoft/playwright/issues/2973
  ],
};
export default config;
