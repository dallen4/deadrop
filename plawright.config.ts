import { PlaywrightTestConfig, devices } from '@playwright/test';
import path from 'path';

const PORT = process.env.PORT || 3000;

const baseURL = process.env.TEST_URI || `http://localhost:${PORT}/`;

// ref: https://playwright.dev/docs/test-configuration
const config: PlaywrightTestConfig = {
    timeout: 30 * 1000,
    testDir: path.join(__dirname, 'tests', 'e2e'),
    retries: 2,
    outputDir: 'test-results/',
    expect: {},
    webServer: {
        command: 'yarn run start',
        url: baseURL,
        timeout: 120 * 1000,
        reuseExistingServer: !process.env.CI,
    },
    use: {
        baseURL,
        trace: 'retry-with-trace',
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
