import { Page, expect } from '@playwright/test';
import { DROP_PATH } from '@shared/config/paths';
import {
  BEGIN_DROP_BTN_ID,
  CONFIRM_PAYLOAD_BTN_ID,
  DROP_LINK_ID,
} from 'lib/constants';

export async function setupDrop(page: Page, secretValue: string) {
  await page.goto(DROP_PATH);

  await page.locator(`#${BEGIN_DROP_BTN_ID}`).click();

  await expect(
    page.getByRole('heading', {
      name: 'add your secret',
    }),
  ).toBeVisible({
    timeout: 10_000,
  });

  await page.getByPlaceholder('Your secret').fill(secretValue);

  await page.locator(`#${CONFIRM_PAYLOAD_BTN_ID}`).click();

  const dropLink = await page
    .locator(`#${DROP_LINK_ID}`)
    .getAttribute('href');

  return dropLink!;
}
