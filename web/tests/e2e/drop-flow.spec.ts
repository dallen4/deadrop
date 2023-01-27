import { DROP_PATH } from '@config/paths';
import { expect } from '@playwright/test';
import { test } from './util';
import { createPageForBrowser } from './util';

test('should start the drop session successfully', async ({
    playwright,
    dropBrowser,
    grabBrowser,
}) => {
    const secretValue = 'super secret value';

    const dropperPage = await createPageForBrowser(playwright[dropBrowser]);
    const grabberPage = await createPageForBrowser(playwright[grabBrowser]);

    const dropLink = await test.step('Setup drop', async () => {
        await dropperPage.goto(DROP_PATH);

        await dropperPage.click('text=Begin');

        await expect(
            dropperPage.getByRole('heading', { name: 'waiting for secrets' }),
        ).toBeVisible({
            timeout: 10_000,
        });

        await dropperPage.getByPlaceholder('Your secret').fill(secretValue);

        await dropperPage.click('text="Confirm Payload"');

        // const dropLink = await page.locator('#drop-link').getAttribute('href');
        // console.log(dropLink);
        return '';
    });
});
