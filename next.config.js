const { randomBytes } = require('crypto');
const nextSafe = require('next-safe');

const nonce = randomBytes(8).toString('base64');

const webVitalsDomain = 'https://vitals.vercel-insights.com';

const vercelLiveDomain = 'https://vercel.live';

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
        'frame-src': `${vercelLiveDomain} ${captchaDomains}`,
        'script-src': `'self' 'unsafe-inline' ${vercelLiveDomain} ${webVitalsDomain} ${captchaDomains}`,
        'style-src': `'self' 'unsafe-inline' ${captchaDomains}`,
        'img-src': `'self' https://assets.vercel.com`,
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
