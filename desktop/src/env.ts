// Typed access to the Vite-injected env. All values are baked at build time
// from the VITE_* vars (see .env.example).
export const DEADROP_API_URL = import.meta.env.VITE_DEADROP_API_URL;
export const PEER_SERVER_URL = import.meta.env.VITE_PEER_SERVER_URL;
export const CLERK_PUBLISHABLE_KEY =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
// Public web origin used to build grab links (they must open in a browser
// or a second peer, not inside this desktop window).
export const WEB_URL = import.meta.env.VITE_WEB_URL;
