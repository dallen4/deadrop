// @ts-nocheck
/**
 * Bun binary native addon loader + WebRTC global setup.
 *
 * THIS FILE IS A TEMPLATE — not imported directly.
 * scripts/bun-build.ts reads this file, substitutes the __*__ tokens
 * for the target platform, and writes the result to lib/bun-inject.ts
 * before compilation.
 *
 * It uses static require() calls so Bun's bundler can trace and embed
 * the .node files into the compiled binary. Guarded by typeof Bun so
 * it's a no-op when the esbuild JS build runs under Node.
 *
 * node-datachannel replaces @roamhq/wrtc — it's pure N-API so it works
 * under Bun without hitting unimplemented libuv functions
 * (see https://github.com/oven-sh/bun/issues/18546).
 */

if (typeof Bun !== 'undefined') {
  // Native addon: libsql — bundler hint for platform-tagged .node
  require('@libsql/__LIBSQL_SUFFIX__');

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
