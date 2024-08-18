global.navigator = {
    ...(global.navigator || {}),
    platform: 'system',
};

global.RTCPeerConnection = require('@roamhq/wrtc').RTCPeerConnection;
global.RTCSessionDescription = require('@roamhq/wrtc').RTCSessionDescription;
global.RTCIceCandidate = require('@roamhq/wrtc').RTCIceCandidate;

global.WebSocket = require('ws');
