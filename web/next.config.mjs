/* eslint-disable no-undef */

import { randomBytes } from 'crypto';
import nextSafe from 'next-safe';
import nextMdx from '@next/mdx';
import nextTranspileModules from 'next-transpile-modules';

const withMdx = nextMdx();
const withTM = nextTranspileModules(['shared']);

// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
import { withSentryConfig } from '@sentry/nextjs';

import nextPwa from '@ducanh2912/next-pwa';

const withPWA = nextPwa({
  dest: '/public',
  customWorkerSrc: 'scripts/service-worker',
  register: false,
});

const nonce = randomBytes(8).toString('base64');

const peerHost = new URL(process.env.NEXT_PUBLIC_PEER_SERVER_URL)
  .host;
const peerDomain = `ws://${peerHost}`;

const vercelCdnDomain = 'https://cdn.vercel-insights.com';

const vercelLiveDomain = 'https://vercel.live';

const vercelMetricsDomains = [
  'https://vitals.vercel-insights.com',
  'https://va.vercel-scripts.com',
  vercelLiveDomain,
].join(' ');

const captchaDomains = [
  'https://hcaptcha.com',
  'https://*.hcaptcha.com',
].join(' ');

const sentryDomain = 'https://*.ingest.sentry.io';

const githubAssetsDomain = 'https://avatars.githubusercontent.com';
const googleAssetsDomain = 'https://lh3.googleusercontent.com';
const googleFontsDomain = 'https://fonts.gstatic.com';
const vercelAssetsDomain = 'https://assets.vercel.com';

const clerkDomains = [
  'https://clerk.deadrop.io',
  'https://*.clerk.accounts.dev',
].join(' ');

const clerkImgDomain = 'https://img.clerk.com/';

const assetsDomains = [
  vercelAssetsDomain,
  googleAssetsDomain,
  githubAssetsDomain,
  clerkImgDomain,
].join(' ');

const deadropWorkerDomain = process.env.NEXT_PUBLIC_DEADROP_API_URL;

const connectSrcEntries = [
  `'self'`,
  clerkDomains,
  peerDomain,
  vercelMetricsDomains,
  captchaDomains,
  sentryDomain,
  assetsDomains,
  deadropWorkerDomain,
].join(' ');

const safeConfig = {
  isDev: process.env.NODE_ENV !== 'production',
  contentTypeOptions: 'nosniff',
  xssProtection: '1; mode=block',
  referrerPolicy: 'strict-origin',
  frameOptions: 'DENY',
  permissionsPolicy: false,
  contentSecurityPolicy: {
    'connect-src': connectSrcEntries,
    'default-src': `'self'`,
    'font-src': `'self' data: ${vercelAssetsDomain} ${googleFontsDomain}`,
    'frame-src': `${vercelLiveDomain} ${captchaDomains}`,
    'script-src': `'self' 'unsafe-inline' ${clerkDomains} ${vercelMetricsDomains} ${vercelCdnDomain} ${captchaDomains}`,
    'style-src': `'self' 'unsafe-inline' ${captchaDomains}`,
    'img-src': `'self' data: ${assetsDomains}`,
    'worker-src': `'self' blob:`,
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
const baseConfig = {
  swcMinify: true,
  poweredByHeader: false,
  headers() {
    return [
      {
        source: '/vault/:path*',
        headers: [
          /**
           * Cross-Origin-Embedder-Policy & Cross-Origin-Opener-Policy
           * are required for OPFS
           */
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          ...headers,
        ],
      },
      {
        source: '/((?!vault).*)',
        headers,
      },
    ];
  },
  publicRuntimeConfig: {
    nonce,
  },
  pageExtensions: ['tsx', 'ts', 'js', 'md', 'mdx'],
};

const configWithMdx = withMdx(baseConfig);

/**
 * @type {import('next').NextConfig}
 */
const configWithTranspiledModules = withTM(configWithMdx);

/**
 * @type {import('next').NextConfig}
 */
const configWithSentry = withSentryConfig(
  configWithTranspiledModules,
  { silent: true },
  { hideSourcemaps: true },
);

/**
 * @type {import('next').NextConfig}
 */
export default withPWA(configWithSentry);
