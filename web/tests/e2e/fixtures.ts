import { test as base, BrowserContext } from '@playwright/test';
import { createContextForBrowser, TestOptions } from './util';

export const multiBrowserTest = base.extend<
  TestOptions & { dropUser: BrowserContext; grabUser: BrowserContext }
>({
  dropBrowser: ['chromium', { option: true }],
  grabBrowser: ['chromium', { option: true }],
  dropUser: async ({ dropBrowser, playwright }, use) => {
    const browser = await playwright[dropBrowser].launch();
    const context = await createContextForBrowser(browser);

    await use(context);

    await context.close();
    await browser.close();
  },
  grabUser: async ({ grabBrowser, playwright }, use) => {
    const browser = await playwright[grabBrowser].launch();
    const context = await createContextForBrowser(browser);

    await use(context);

    await context.close();
    await browser.close();
  },
});
