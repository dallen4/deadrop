Object.defineProperty(globalThis, 'navigator', {
    value: {
        ...(globalThis.navigator || {}),
        platform: 'system',
    },
    writable: true,
    configurable: true,
});

global.RTCPeerConnection = require('@roamhq/wrtc').RTCPeerConnection;
global.RTCSessionDescription = require('@roamhq/wrtc').RTCSessionDescription;
global.RTCIceCandidate = require('@roamhq/wrtc').RTCIceCandidate;

global.WebSocket = require('ws');
