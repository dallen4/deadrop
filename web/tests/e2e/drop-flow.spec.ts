import { DROP_PATH } from '@shared/config/paths';
import { expect } from '@playwright/test';
import {
  createContextForBrowser,
  createPageForBrowser,
  test,
} from './util';
import {
  BEGIN_DROP_BTN_ID,
  CONFIRM_PAYLOAD_BTN_ID,
  DROP_LINK_ID,
  DROP_SECRET_VALUE_ID,
} from '../../lib/constants';

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

    await dropperPage.locator(`#${BEGIN_DROP_BTN_ID}`).click();

    await expect(
      dropperPage.getByRole('heading', { name: 'add your secret' }),
    ).toBeVisible({
      timeout: 10_000,
    });

    await dropperPage
      .getByPlaceholder('Your secret')
      .fill(secretValue);

    await dropperPage.locator(`#${CONFIRM_PAYLOAD_BTN_ID}`).click();

    const dropLink = await dropperPage
      .locator(`#${DROP_LINK_ID}`)
      .getAttribute('href');

    return dropLink!;
  });

  const grabbedSecretValue =
    await test.step('Drop & grab secret', async () => {
      await grabberPage.goto(dropLink);

      await grabberPage.locator('#begin-grab-btn').click();

      await expect(
        grabberPage.locator(`#${DROP_SECRET_VALUE_ID}`),
      ).toBeVisible({
        timeout: 20_000,
      });

      return grabberPage
        .locator(`#${DROP_SECRET_VALUE_ID}`)
        .innerHTML();
    });

  expect(grabbedSecretValue).toBeDefined();
  expect(grabbedSecretValue).toEqual(secretValue);

  await dropperPage.close();
  await grabberPage.close();

  await context.close();

  // TODO redo pattern to allow `close()` invocation on browser instances
});
