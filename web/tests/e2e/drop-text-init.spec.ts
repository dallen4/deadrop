import { DROP_PATH } from '@config/paths';
import { test, expect } from '@playwright/test';
import { createPageForBrowser } from './util';

test('should start the drop session successfully', async ({ playwright }) => {
    const page = await createPageForBrowser(playwright.webkit);

    await page.goto(DROP_PATH);

    const secretValue = 'super secret value';

    await page.click('text=Begin');

    await expect(
        page.getByRole('heading', { name: 'waiting for secrets' }),
    ).toBeVisible({
        timeout: 10_000,
    });

    await page.getByPlaceholder('Your secret').fill(secretValue);

    await page.click('text=Confirm Payload');
});
