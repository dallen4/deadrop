import Peer from 'peerjs';

const isServer = typeof window === 'undefined';

const onUnload = (e: BeforeUnloadEvent) => {
    const event = e || window.event;

    if (event) event.returnValue = 'Are you sure you want to leave?';

    return 'Are you sure you want to leave?';
};

export const removeOnUnloadListener = () => {
    if (!isServer) {
        window.onbeforeunload = null;
        window.removeEventListener('beforeunload', onUnload);
    }
};

export function createPeer(id: string, url: string) {
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

    peer.on('disconnected', removeOnUnloadListener);

    peer.on('close', removeOnUnloadListener);

    return new Promise<Peer>((resolve) => {
        peer.on('open', (id: string) => {
            if (!isServer) window.onbeforeunload = onUnload;

            resolve(peer);
        });
    });
}
