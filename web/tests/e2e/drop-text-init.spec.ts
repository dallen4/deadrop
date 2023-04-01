import { DROP_PATH } from '@config/paths';
import { expect } from '@playwright/test';
import { test, createContextForBrowser } from './util';

test('should start the drop session successfully', async ({ browser }) => {
    const context = await createContextForBrowser(browser);
    const page = await context.newPage();

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

    const dropLink = await page.locator('#drop-link').getAttribute('href');

    expect(dropLink).toBeDefined();
});
