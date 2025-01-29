import type { Workbox } from 'workbox-window';

declare global {
  // extend Crypto for WebKit interfaces
  interface Crypto {
    webkitSubtle?: SubtleCrypto;
  }

  // extend Window for workbox (service worker)
  interface Window {
    workbox: Workbox;
  }
}
