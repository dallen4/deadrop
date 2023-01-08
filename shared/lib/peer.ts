const isServer = typeof window === 'undefined';

if (isServer) {
    global.navigator = {
        ...(global.navigator || {}),
        platform: 'system',
    };

    const wrtc = require('wrtc');

    global.RTCPeerConnection = wrtc.RTCPeerConnection;
    global.RTCSessionDescription = wrtc.RTCSessionDescription;
    global.RTCIceCandidate = wrtc.RTCIceCandidate;

    global.WebSocket = require('ws');
}

import Peer from 'peerjs';

function createPeer(id: string, url: string) {
    const server = new URL(url);

    const peer = new Peer(id, {
        host: server.host,
        path: server.pathname,
        secure: true,
        port: 443,
    });

    peer.on('call', (call) => {
        console.log('Call attempted by: ', call.peer);
        call.close();
    });

    peer.on('error', (err) => {
        console.error(err);

        if (peer.disconnected) {
            console.log('reconnecting');
            peer.reconnect();
        }
    });

    peer.on('disconnected', () => {
        if (!isServer) window.onbeforeunload = null;
    });

    peer.on('close', () => {
        if (!isServer) window.onbeforeunload = null;
    });

    return new Promise<Peer>((resolve) => {
        peer.on('open', (id: string) => {
            if (!isServer)
                window.onbeforeunload = (e) => {
                    const event = e || window.event;

                    if (event) event.returnValue = 'Are you sure you want to leave?';

                    return 'Are you sure you want to leave?';
                };

            resolve(peer);
        });
    });
}

export { createPeer };
