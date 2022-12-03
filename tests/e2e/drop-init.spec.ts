import { test, expect } from '@playwright/test';
import { baseURL } from './config';

test('should start the drop session successfully', async ({ page }) => {
    await page.goto(baseURL);

    await page.click('text=Begin');

    await expect(
        page.getByRole('heading', { name: 'waiting for secrets' }),
    ).toBeVisible({ timeout: 10_000 });
});
