import { DROP_PATH } from '@config/paths';
import { expect } from '@playwright/test';
import { createContextForBrowser, createPageForBrowser, test } from './util';

test('should drop a text secret from one page session to another', async ({
    playwright,
    browser,
    dropBrowser,
    grabBrowser,
}) => {
    const context = await createContextForBrowser(browser);
    const dropperPage = dropBrowser
        ? await createPageForBrowser(playwright[dropBrowser])
        : await context.newPage();
    const grabberPage = grabBrowser
        ? await createPageForBrowser(playwright[grabBrowser])
        : await context.newPage();

    const secretValue = 'super secret value';

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

        const dropLink = await dropperPage
            .locator('#drop-link')
            .getAttribute('href');

        return dropLink!;
    });

    const grabbedSecretValue =
        await test.step('Drop & grab secret', async () => {
            await grabberPage.goto(dropLink);

            await grabberPage.locator('#begin-grab-btn').click();

            await expect(
                grabberPage.getByText('Waiting for payload drop...'),
            ).toBeVisible({
                timeout: 10_000,
            });

            await expect(
                dropperPage.getByRole('heading', {
                    name: 'finish your deadrop',
                }),
            ).toBeVisible({
                timeout: 10_000,
            });

            await dropperPage.locator('#drop-secret-btn').click();

            return grabberPage.locator('#drop-secret-value').innerHTML();
        });

    expect(grabbedSecretValue).toBeDefined();
    expect(grabbedSecretValue).toEqual(secretValue);
});
