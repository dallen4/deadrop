import { PlaywrightTestConfig, devices } from '@playwright/test';
import path from 'path';

const PORT = process.env.PORT || 3000;

const baseURL = process.env.TEST_URI || `http://localhost:${PORT}/`;

const isLocal = baseURL.includes('localhost');

// ref: https://playwright.dev/docs/test-configuration
const config: PlaywrightTestConfig = {
    timeout: 30_000,
    testDir: path.join(__dirname, 'tests', 'e2e'),
    retries: 2,
    outputDir: 'test-results/',
    expect: {},
    webServer: isLocal
        ? {
              command: 'yarn run start',
              url: baseURL,
              timeout: 120_000,
          }
        : undefined,
    use: {
        baseURL,
        trace: 'retry-with-trace',
        bypassCSP: true,
    },
    projects: [
        {
            name: 'Desktop Chrome',
            use: {
                ...devices['Desktop Chrome'],
            },
        },
        {
            name: 'Desktop Firefox',
            use: {
                ...devices['Desktop Firefox'],
            },
        },
        {
            name: 'Desktop Safari',
            use: {
                ...devices['Desktop Safari'],
            },
        },
        // Test against mobile viewports.
        // {
        //     name: 'Mobile Chrome',
        //     use: {
        //         ...devices['Pixel 5'],
        //     },
        // },
        // {
        //     name: 'Mobile Safari',
        //     use: devices['iPhone 12'],
        // },
    ],
};
export default config;
