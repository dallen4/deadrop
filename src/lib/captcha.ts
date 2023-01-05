import type { HCaptchaResponse } from '~types/captcha';

const VERIFY_CAPTCHA_URL = 'https://hcaptcha.com/siteverify';

export const verifyCaptcha = async (userResponse: string) => {
    const res = await fetch(VERIFY_CAPTCHA_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `response=${userResponse}&secret=${process.env
            .HCAPTCHA_SECRET!}&sitekey=${process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY!}`,
    });

    const data: HCaptchaResponse = await res.json();

    return data.success;
};
