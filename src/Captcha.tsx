import React from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';

export const Captcha = ({ setToken }: CaptchaProps) => {
    const onVerify = (token: string, _ekey: string) => {
        setToken(token);
    };

    const onExpire = () => {
        setToken(null);
    };

    return (
        <HCaptcha
            sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY!}
            onVerify={onVerify}
            onExpire={onExpire}
        />
    );
};

type CaptchaProps = {
    setToken: (token: string | null) => void;
};
