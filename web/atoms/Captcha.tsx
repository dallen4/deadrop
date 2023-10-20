import React from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { post } from '@shared/lib/fetch';
import { CAPTCHA_API_PATCH } from 'config/paths';

export const Captcha = ({ onSuccess, onExpire }: CaptchaProps) => {
    const onVerify = async (token: string, _ekey: string) => {
        const resp = await post<{ success: boolean }, { token: string }>(
            CAPTCHA_API_PATCH,
            { token },
        );

        if (resp.success) onSuccess();
    };

    const onError = (event: string) => {
        console.warn(event);
    };

    return (
        <HCaptcha
            sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY!}
            onVerify={onVerify}
            onError={onError}
            onExpire={onExpire}
        />
    );
};

type CaptchaProps = {
    onSuccess: () => void;
    onExpire: () => void;
};
