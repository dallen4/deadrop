// @ts-nocheck
/**
 * Bun binary native addon loader + WebRTC global setup.
 *
 * Not imported directly — scripts/bun-build.ts copies this file to
 * lib/bun-inject.ts (with a generated header) before compilation.
 *
 * Guarded by typeof Bun so it's a no-op when the esbuild JS build
 * runs under Node.
 *
 * node-datachannel replaces @roamhq/wrtc — it's pure N-API so it works
 * under Bun without hitting unimplemented libuv functions
 * (see https://github.com/oven-sh/bun/issues/18546).
 *
 * libsql's native addon is handled separately via the libsqlNativePlugin
 * in bun-build.ts, which patches libsql/index.js at bundle time to use
 * a static .node path that Bun can embed.
 */

if (typeof Bun !== 'undefined') {
  // Native addon: node-datachannel (WebRTC) + polyfill globals.
  const polyfill = require('node-datachannel/polyfill');

  Object.defineProperty(globalThis, 'navigator', {
    value: { ...(globalThis.navigator || {}), platform: 'system' },
    writable: true,
    configurable: true,
  });

  globalThis.RTCPeerConnection = polyfill.RTCPeerConnection;
  globalThis.RTCSessionDescription = polyfill.RTCSessionDescription;
  globalThis.RTCIceCandidate = polyfill.RTCIceCandidate;
}
