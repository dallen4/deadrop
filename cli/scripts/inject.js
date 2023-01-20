global.navigator = {
    ...(global.navigator || {}),
    platform: 'system',
};

global.RTCPeerConnection = require('wrtc').RTCPeerConnection;
global.RTCSessionDescription = require('wrtc').RTCSessionDescription;
global.RTCIceCandidate = require('wrtc').RTCIceCandidate;

global.WebSocket = require('ws');
