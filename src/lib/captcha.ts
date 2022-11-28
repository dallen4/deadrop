import { HCaptchaBody, HCaptchaResponse } from 'types/captcha';
import { post } from './fetch';

const VERIFY_CAPTCHA_URL = 'https://hcaptcha.com/siteverify';

export const verifyCaptcha = async (userResponse: string) => {
    const data = await post<HCaptchaResponse, HCaptchaBody>(
        VERIFY_CAPTCHA_URL,
        {
            response: userResponse,
            secret: process.env.HCAPTCHA_SECRET!,
            sitekey: process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY!,
        },
        { 'Content-Type': 'application/x-www-form-urlencoded' },
    );

    return data.success;
};
