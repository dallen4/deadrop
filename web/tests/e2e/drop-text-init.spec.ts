import { DROP_PATH } from '@shared/config/paths';
import { expect } from '@playwright/test';
import { test, createContextForBrowser } from './util';
import {
  BEGIN_DROP_BTN_ID,
  CONFIRM_PAYLOAD_BTN_ID,
  DROP_LINK_ID,
} from '../../lib/constants';

test('should start the drop session successfully', async ({
  browser,
}) => {
  const context = await createContextForBrowser(browser);
  const page = await context.newPage();

  await page.goto(DROP_PATH);

  const secretValue = 'super secret value';

  await page.locator(`#${BEGIN_DROP_BTN_ID}`).click();

  await expect(
    page.getByRole('heading', { name: 'add your secret' }),
  ).toBeVisible({
    timeout: 10_000,
  });

  await page.getByPlaceholder('Your secret').fill(secretValue);

  await page.locator(`#${CONFIRM_PAYLOAD_BTN_ID}`).click();

  const dropLink = await page
    .locator(`#${DROP_LINK_ID}`)
    .getAttribute('href');

  expect(dropLink).toBeDefined();

  await page.close();
  await browser.close();
});
