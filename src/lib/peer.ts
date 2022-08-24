import Peer from 'peerjs';

export const initPeer = (id: string) =>
    new Peer(id, {
        host: 'uchat-server.herokuapp.com',
        secure: true,
        port: 443,
    });
