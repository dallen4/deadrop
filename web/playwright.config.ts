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
  timeout: 30_000,
  testDir: path.join(__dirname, 'tests', 'e2e'),
  retries: 2,
  outputDir: 'test-results/',
  expect: {},
  webServer: isLocal ? server : undefined,
  workers: isLocal ? 3 : undefined,
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
      name: 'Chrome to WebKit',
      use: {
        dropBrowser: 'chromium',
        grabBrowser: 'webkit',
      },
    },
    {
      name: 'Firefox to Chrome',
      use: {
        dropBrowser: 'firefox',
        grabBrowser: 'chromium',
      },
    },
    {
      name: 'Firefox to WebKit',
      use: {
        dropBrowser: 'firefox',
        grabBrowser: 'webkit',
      },
    },
    {
      name: 'WebKit to Chrome',
      use: {
        dropBrowser: 'webkit',
        grabBrowser: 'chromium',
      },
    },
    {
      name: 'WebKit to Firefox',
      use: {
        dropBrowser: 'webkit',
        grabBrowser: 'firefox',
      },
    },
  ],
};
export default config;
