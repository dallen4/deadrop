import Peer from 'peerjs';

let attempt = 0;

export const initPeer = (id: string) => {
    const peer = new Peer(id, {
        host: 'uchat-server.herokuapp.com',
        secure: true,
        port: 443,
    });

    peer.on('call', (call) => {
        console.log('Call attempted by: ', call.peer);
        call.close();
    });

    peer.on('error', console.error);

    peer.on('disconnected', () => {
        if (attempt < 3) peer.reconnect();
        else window.onbeforeunload = null;
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
