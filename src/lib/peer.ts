import Peer from 'peerjs';

let attempt = 0;

export const initPeer = (id: string) => {
    const server = new URL(process.env.NEXT_PUBLIC_PEER_SERVER_URL!);

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
        window.onbeforeunload = null;
    });

    peer.on('close', () => {
        window.onbeforeunload = null;
    });

    return new Promise<Peer>((resolve) => {
        peer.on('open', (id: string) => {
            window.onbeforeunload = (e) => {
                const event = e || window.event;

                if (event) event.returnValue = 'Are you sure you want to leave?';

                return 'Are you sure you want to leave?';
            };

            resolve(peer);
        });
    });
};
