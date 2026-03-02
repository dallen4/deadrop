import { randomBytes } from 'node:crypto';

const nonce = randomBytes(8).toString('base64');

const peerHost = new URL(import.meta.env.VITE_PEER_SERVER_URL).host;
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

const deadropWorkerDomain = import.meta.env.VITE_DEADROP_API_URL;

const contentSecurityPolicy = {
  'connect-src': `'self' ${clerkDomains} ${peerDomain} ${vercelMetricsDomains} ${captchaDomains} ${sentryDomain} ${assetsDomains} ${deadropWorkerDomain}`,
  'default-src': `'self'`,
  'font-src': `'self' data: ${vercelAssetsDomain} ${googleFontsDomain}`,
  'frame-src': `${vercelLiveDomain} ${captchaDomains}`,
  'script-src': `'self' 'unsafe-inline' ${clerkDomains} ${vercelMetricsDomains} ${vercelCdnDomain} ${captchaDomains}`,
  'style-src': `'self' 'unsafe-inline' ${captchaDomains}`,
  'img-src': `'self' data: ${assetsDomains}`,
  'worker-src': `'self' blob:`,
};

export function initAppHeaders(headers: Headers = new Headers()) {
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set(
    'Referrer-Policy',
    'strict-origin-when-cross-origin',
  );
  headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  );
  headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload',
  );

  headers.set(
    'Content-Security-Policy',
    Object.entries(contentSecurityPolicy)
      .map(([key, value]) => `${key} ${value}`)
      .join('; '),
  );

  return headers;
}
