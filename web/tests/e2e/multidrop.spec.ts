import { expect } from '@playwright/test';
import { DROP_PATH } from '@shared/config/paths';
import {
  BEGIN_DROP_BTN_ID,
  CONFIRM_PAYLOAD_BTN_ID,
  DROP_LINK_ID,
  DROP_SECRET_VALUE_ID,
} from '../../lib/constants';
import {
  createContextForBrowser,
  createPageForBrowser,
  test,
} from './util';

// multidrop fans a single secret out to many grabbers over one session.
// Here we exercise a cap of 2: both grabbers must receive and verify the
// identical secret, and the dropper session completes once the second
// grabber confirms. The CI test session (test-mode cookie + test token)
// acts as the experimental bypass that unlocks caps above the free
// plan's single-grabber default.
test('drops one secret to two grabbers with a maxGrabbers cap of 2', async ({
  playwright,
  browser,
  dropBrowser,
  grabBrowser,
}) => {
  const context = await createContextForBrowser(browser);

  const dropperPage = dropBrowser
    ? await createPageForBrowser(playwright[dropBrowser])
    : await context.newPage();

  const makeGrabberPage = () =>
    grabBrowser
      ? createPageForBrowser(playwright[grabBrowser])
      : context.newPage();

  const secretValue = 'one secret, many grabbers';

  const dropLink = await test.step('Setup multidrop (cap 2)', async () => {
    await dropperPage.goto(DROP_PATH);

    // the test-mode cookie unlocks the experimental max-grabbers control;
    // the cap must be set before the drop is created
    const capInput = dropperPage.getByLabel('Max grabbers');
    await expect(capInput).toBeVisible({ timeout: 10_000 });
    await capInput.fill('2');

    await dropperPage.locator(`#${BEGIN_DROP_BTN_ID}`).click();

    await expect(
      dropperPage.getByRole('heading', { name: 'add your secret' }),
    ).toBeVisible({ timeout: 10_000 });

    await dropperPage
      .getByPlaceholder('Your secret')
      .fill(secretValue);

    await dropperPage.locator(`#${CONFIRM_PAYLOAD_BTN_ID}`).click();

    const link = await dropperPage
      .locator(`#${DROP_LINK_ID}`)
      .getAttribute('href');

    return link!;
  });

  // sequential grabs keep WebRTC ICE negotiation stable across the
  // separate browser instances in CI; per-grabber key/lock isolation is
  // covered by the shared unit tests
  const grabSecret = (label: string) =>
    test.step(`Grab as ${label}`, async () => {
      const grabberPage = await makeGrabberPage();

      await grabberPage.goto(dropLink);
      await grabberPage.locator('#begin-grab-btn').click();

      await expect(
        grabberPage.locator(`#${DROP_SECRET_VALUE_ID}`),
      ).toBeVisible({ timeout: 20_000 });

      const value = await grabberPage
        .locator(`#${DROP_SECRET_VALUE_ID}`)
        .innerHTML();

      return { grabberPage, value };
    });

  const first = await grabSecret('grabber one');
  const second = await grabSecret('grabber two');

  expect(first.value).toBeDefined();
  expect(second.value).toBeDefined();
  expect(first.value).toEqual(secretValue);
  expect(second.value).toEqual(secretValue);

  await test.step('Dropper completes after the second confirm', async () => {
    await expect(dropperPage.getByText('All done!')).toBeVisible({
      timeout: 20_000,
    });
  });

  await dropperPage.close();
  await first.grabberPage.close();
  await second.grabberPage.close();

  await context.close();
});
