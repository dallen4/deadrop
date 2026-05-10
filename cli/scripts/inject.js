// esbuild inject file — sets up WebRTC globals for Node.js
// Uses node-datachannel polyfill (same lib as the Bun binary build)
const polyfill = require('node-datachannel/polyfill');

Object.defineProperty(globalThis, 'navigator', {
  value: {
    ...(globalThis.navigator || {}),
    platform: 'system',
  },
  writable: true,
  configurable: true,
});

global.RTCPeerConnection = polyfill.RTCPeerConnection;
global.RTCSessionDescription = polyfill.RTCSessionDescription;
global.RTCIceCandidate = polyfill.RTCIceCandidate;
