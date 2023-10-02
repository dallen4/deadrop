global.navigator = {
    ...(global.navigator || {}),
    platform: 'system',
};

global.RTCPeerConnection = require('@koush/wrtc').RTCPeerConnection;
global.RTCSessionDescription = require('@koush/wrtc').RTCSessionDescription;
global.RTCIceCandidate = require('@koush/wrtc').RTCIceCandidate;

global.WebSocket = require('ws');
