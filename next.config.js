const webVitalsDomain = 'vitals.vercel-insights.com';

const captchaDomains = ['https://hcaptcha.com', 'https://*.hcaptcha.com'].join(' ');

const ContentSecurityPolicy = `
    default-src 'self';
    script-src 'self' ${captchaDomains};
    connect-src ${webVitalsDomain} ${captchaDomains};
    style-src 'self' ${captchaDomains};
    frame-src ${captchaDomains};
    font-src 'self';
`
    .replace(/\s{2,}/g, ' ')
    .trim();

const headers = [
    {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
    },
    {
        key: 'X-XSS-Protection',
        value: '1; mode=block',
    },
    {
        key: 'X-Frame-Options',
        value: 'SAMEORIGIN',
    },
    {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
    },
    {
        key: 'Referrer-Policy',
        value: 'strict-origin',
    },
    {
        key: 'Content-Security-Policy',
        value: ContentSecurityPolicy,
    },
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
};
