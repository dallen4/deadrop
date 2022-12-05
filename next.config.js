const { randomBytes } = require('crypto');
const nextSafe = require('next-safe');

const nonce = randomBytes(8).toString('base64');

const webVitalsDomain = 'https://vitals.vercel-insights.com';

const captchaDomains = ['https://hcaptcha.com', 'https://*.hcaptcha.com'].join(' ');

const safeConfig = {
    isDev: process.env.NODE_ENV !== 'production',
    contentTypeOptions: 'nosniff',
    xssProtection: '1; mode=block',
    referrerPolicy: 'strict-origin',
    frameOptions: 'DENY',
    permissionsPolicy: false,
    contentSecurityPolicy: {
        'connect-src': `'self' ${webVitalsDomain} ${captchaDomains}`,
        'default-src': `'self'`,
        'font-src': `'self' data:`,
        'frame-src': captchaDomains,
        'script-src': `'self' 'unsafe-inline' https://vercel.live ${webVitalsDomain} ${captchaDomains}`,
        'style-src': `'self' 'unsafe-inline' ${captchaDomains}`,
    },
};

const headers = [
    {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
    },
    ...nextSafe(safeConfig),
];

/**
 * @type {import('next').NextConfig}
 */
module.exports = {
    swcMinify: true,
    poweredByHeader: false,
    headers() {
        return [
            {
                source: '/:path*',
                headers,
            },
        ];
    },
    publicRuntimeConfig: {
        nonce,
    },
};
