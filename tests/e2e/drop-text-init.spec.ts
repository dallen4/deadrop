import { test, expect } from '@playwright/test';
import { baseURL } from './config';

test('should start the drop session successfully', async ({ page }) => {
    await page.goto(baseURL);

    const secretValue = 'super secret value';

    await page.click('text=Begin');

    const secretsHeading = page.getByRole('heading', { name: 'waiting for secrets' });
    await expect(secretsHeading).toBeVisible({
        timeout: 3_000,
    });

    page.getByPlaceholder('Your secret').fill(secretValue);

    await page.click('text="Confirm Payload"');
});
