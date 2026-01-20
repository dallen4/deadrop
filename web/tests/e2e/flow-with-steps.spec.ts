import { expect } from '@playwright/test';
import { DROP_SECRET_VALUE_ID } from 'lib/constants';
import { multiBrowserTest } from './fixtures';
import { setupDrop } from './steps';

multiBrowserTest.skip(
  'should drop a text secret from one page session to another',
  async ({ dropUser, grabUser }) => {
    const dropperPage = await dropUser.newPage();
    const grabberPage = await grabUser.newPage();

    const secretValue = 'super secret value';

    const dropLink = await multiBrowserTest.step(
      'Setup drop',
      () => setupDrop(dropperPage, secretValue),
    );

    const grabbedSecretValue = await multiBrowserTest.step(
      'Drop & grab secret',
      async () => {
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
      },
    );

    expect(grabbedSecretValue).toBeDefined();
    expect(grabbedSecretValue).toEqual(secretValue);
  },
);
