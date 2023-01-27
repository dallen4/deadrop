import { PlaywrightTestConfig } from '@playwright/test';
import path from 'path';

const PORT = process.env.PORT || 3000;

const baseURL = process.env.TEST_URI || `http://localhost:${PORT}/`;

const isLocal = baseURL.includes('localhost');

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
    use: {
        baseURL,
        trace: 'retry-with-trace',
        bypassCSP: true,
    },
    projects: [
        {
            name: 'Chrome to Chrome',
            use: {
                dropBrowser: 'chromium',
                grabBrowser: 'chromium',
            },
        },
        {
            name: 'Firefox to Firefox',
            use: {
                dropBrowser: 'firefox',
                grabBrowser: 'firefox',
            },
        },
        {
            name: 'WebKit to WebKit',
            use: {
                dropBrowser: 'webkit',
                grabBrowser: 'webkit',
            },
        },
    ],
};
export default config;
