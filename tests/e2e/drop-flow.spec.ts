import { test, expect } from '@playwright/test';
import { baseURL } from './config';
import { createPageForBrowser } from './util';

test('should start the drop session successfully', async ({ playwright }) => {
    const secretValue = 'super secret value';

    const dropperPage = await createPageForBrowser(playwright.webkit);
    const grabberPage = await createPageForBrowser(playwright.chromium);

    const dropLink = await test.step('Setup drop', async () => {
        await dropperPage.goto(baseURL);

        await dropperPage.click('text=Begin');

        const secretsHeading = dropperPage.getByRole('heading', {
            name: 'waiting for secrets',
        });
        await expect(secretsHeading).toBeVisible({
            timeout: 3_000,
        });

        dropperPage.getByPlaceholder('Your secret').fill(secretValue);

        await dropperPage.click('text="Confirm Payload"');

        // const dropLink = await page.locator('#drop-link').getAttribute('href');
        // console.log(dropLink);
        return '';
    });
});
