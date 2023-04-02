/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */

const { randomBytes } = require('crypto');
const nextSafe = require('next-safe');
const withTM = require('next-transpile-modules')(['shared']);

// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
const { withSentryConfig } = require('@sentry/nextjs');

const nonce = randomBytes(8).toString('base64');

const peerHost = new URL(process.env.NEXT_PUBLIC_PEER_SERVER_URL).host;
const peerDomain = `ws://${peerHost}`;

const vercelCdnDomain = 'https://cdn.vercel-insights.com';

const webVitalsDomain = 'https://vitals.vercel-insights.com';

const vercelLiveDomain = 'https://vercel.live';

const captchaDomains = ['https://hcaptcha.com', 'https://*.hcaptcha.com'].join(
    ' ',
);

const sentryDomain = 'https://*.ingest.sentry.io';

const safeConfig = {
    isDev: process.env.NODE_ENV !== 'production',
    contentTypeOptions: 'nosniff',
    xssProtection: '1; mode=block',
    referrerPolicy: 'strict-origin',
    frameOptions: 'DENY',
    permissionsPolicy: false,
    contentSecurityPolicy: {
        'connect-src': `'self' ${peerDomain} ${webVitalsDomain} ${captchaDomains} ${sentryDomain}`,
        'default-src': `'self'`,
        'font-src': `'self' data:`,
        'frame-src': `${vercelLiveDomain} ${captchaDomains}`,
        'script-src': `'self' 'unsafe-inline' ${vercelLiveDomain} ${webVitalsDomain} ${vercelCdnDomain} ${captchaDomains}`,
        'style-src': `'self' 'unsafe-inline' ${captchaDomains}`,
        'img-src': `'self' data: https://assets.vercel.com`,
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
const configWithTranspiledModules = withTM({
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
});

/**
 * @type {import('next').NextConfig}
 */
module.exports = withSentryConfig(
    configWithTranspiledModules,
    { silent: true },
    { hideSourcemaps: true },
);
