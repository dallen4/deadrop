if (typeof window === 'undefined') {
    global.navigator = {
        platform: 'system',
    };

    const wrtc = require('wrtc');

    global.RTCPeerConnection = wrtc.RTCPeerConnection;
    global.RTCSessionDescription = wrtc.RTCSessionDescription;
    global.RTCIceCandidate = wrtc.RTCIceCandidate;

    global.WebSocket = require('ws');
}

const Peer = require('peerjs').default;
const { randomUUID } = require('crypto');

const server = new URL('https://peerjs-server.onrender.com/myapp');

(async () => {
    const peer = new Peer(randomUUID(), {
        host: server.host,
        path: server.pathname,
        secure: true,
        port: 443,
    });

    peer.on('error', console.error)

    const peerInit = new Promise((resolve) => {
        peer.on('open', (id) => {
            console.log(
                'CONNECTED FJDKSAJFLKDSAJFKLDSAJFKLDSJAFKLDSJAKFLDSJAKLFDSJA',
            );

            resolve(peer);
        });
    });

    const value = await peerInit;
    console.log(value);
})();
