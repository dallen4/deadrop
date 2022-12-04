import { DISABLE_CAPTCHA_COOKIE } from '@lib/constants';
import { BrowserType } from '@playwright/test';

export const createPageForBrowser = async (browser: BrowserType) => {
    const newBrowser = await browser.launch();
    const context = await newBrowser.newContext();

    context.addCookies([
        { name: DISABLE_CAPTCHA_COOKIE, value: 'true', sameSite: 'Strict' },
    ]);

    return context.newPage();
};
