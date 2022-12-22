import { DISABLE_CAPTCHA_COOKIE } from '@config/cookies';
import { BrowserType } from '@playwright/test';
import { baseURL } from './config';

export const createPageForBrowser = async (browser: BrowserType) => {
    const newBrowser = await browser.launch();
    const context = await newBrowser.newContext();

    await context.addCookies([
        {
            name: DISABLE_CAPTCHA_COOKIE,
            value: 'true',
            sameSite: 'Strict',
            url: baseURL,
        },
    ]);

    return context.newPage();
};
