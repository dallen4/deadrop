export type HCaptchaBody = {
    response: string;
    secret: string;
    sitekey: string;
};

export type HCaptchaResponse = {
    success: boolean;
    challenge_ts: string;
    hostname: string;
    credit?: boolean;
    'error-codes'?: string[];
};
