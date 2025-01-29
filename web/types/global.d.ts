import type { Workbox } from 'workbox-window';

// extend Crypto for WebKit interfaces
interface Crypto {
  webkitSubtle?: SubtleCrypto;
}

// extend Window for workbox (service worker)
declare global {
  interface Window {
    workbox: Workbox;
  }
}
