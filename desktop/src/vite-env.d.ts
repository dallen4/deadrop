/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEADROP_API_URL: string;
  readonly VITE_PEER_SERVER_URL: string;
  readonly VITE_TURN_USERNAME: string;
  readonly VITE_TURN_PWD: string;
  readonly VITE_CLERK_PUBLISHABLE_KEY: string;
  readonly VITE_WEB_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
