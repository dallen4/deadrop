const { randomBytes } = require('crypto');
const nextSafe = require('next-safe');

const nonce = randomBytes(8).toString('base64');

const webVitalsDomain = 'https://vitals.vercel-insights.com';

const captchaDomains = ['https://hcaptcha.com', 'https://*.hcaptcha.com'].join(' ');

const ContentSecurityPolicy = `
    default-src 'self';
    script-src 'self' data: 'unsafe-eval' https://vercel.live ${captchaDomains};
    connect-src 'self' data: ${webVitalsDomain} ${captchaDomains};
    style-src 'self' data: 'unsafe-inline' ${captchaDomains};
    frame-src ${captchaDomains};
    font-src 'self' data:;
    object-src 'self';
`
    .replace(/\s{2,}/g, ' ')
    .trim();

const safeConfig = {
    isDev: process.env.NODE_ENV !== 'production',
    contentTypeOptions: 'nosniff',
    xssProtection: '1; mode=block',
    referrerPolicy: 'strict-origin',
    frameOptions: 'DENY',
    contentSecurityPolicy: {
        // 'base-uri': `'none'`,
        // 'child-src': `'none'`,
        'connect-src': `'self' ${webVitalsDomain} ${captchaDomains}`,
        'default-src': `'self'`,
        'font-src': `'self' data:`,
        // 'form-action': `'self'`,
        // 'frame-ancestors': `'none'`,
        'frame-src': captchaDomains,
        // 'img-src': `'self'`,
        // 'manifest-src': `'self'`,
        // 'media-src': `'self'`,
        // 'object-src': `'none'`,
        // 'prefetch-src': `'self'`,
        'script-src': `'self' 'nonce-${nonce}' 'strict-dynamic' https://vercel.live ${webVitalsDomain} ${captchaDomains}`,
        'style-src': `'self' 'nonce-${nonce}' 'unsafe-inline' ${captchaDomains}`,
        // 'worker-src': `'self'`,
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
