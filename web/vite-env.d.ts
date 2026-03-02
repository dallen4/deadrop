/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEADROP_API_URL: string;
  readonly VITE_PEER_SERVER_URL: string;
  readonly VITE_TURN_USERNAME: string;
  readonly VITE_TURN_PWD: string;
  readonly VITE_HCAPTCHA_SITEKEY: string;
  readonly VITE_STRIPE_LIFETIME_LICENSE_LINK: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_CLERK_PUBLISHABLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}